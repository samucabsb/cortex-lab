import logging
from typing import Any, Optional
from langgraph.graph import StateGraph, END
from app.agents.state import LabGraphState
from app.agents.nodes.pi_coordinator import pi_coordinator_node
from app.agents.nodes.miner_node import miner_node, human_screening_node
from app.agents.nodes.methodologist_node import methodologist_node, human_bias_node
from app.agents.nodes.synthesizer_node import synthesizer_node

logger = logging.getLogger("cortexlab.graph")


def route_after_protocol(state: LabGraphState) -> str:
    """An incomplete protocol ends the run; the researcher must fix it."""
    return END if state.get("errors") else "miner_node"


def route_after_miner(state: LabGraphState) -> str:
    """Papers found -> human screening gate; nothing found -> end."""
    return "human_screening_node" if state.get("raw_papers") else END


def route_after_screening(state: LabGraphState) -> str:
    """At least one included study -> audit; otherwise end."""
    return "methodologist_node" if state.get("screened_papers") else END


def route_after_auditor(state: LabGraphState) -> str:
    """Studies flagged for bias attention -> human arbitration gate; else straight to synthesis."""
    flagged = any(p.get("needs_bias_arbitration") for p in state.get("audited_papers", []))
    return "human_bias_node" if flagged else "synthesizer_node"


def build_cortex_graph(checkpointer: Optional[Any] = None):
    """Builds and compiles the CortexLab LangGraph workflow.

    The human gates (`human_screening_node`, `human_bias_node`) call `interrupt()`: execution pauses
    with the state persisted in the checkpointer under the run's `thread_id`, and is resumed with
    `Command(resume=...)`. Without a checkpointer interrupts cannot persist, so always pass one.
    """
    workflow = StateGraph(LabGraphState)

    workflow.add_node("pi_coordinator_node", pi_coordinator_node)
    workflow.add_node("miner_node", miner_node)
    workflow.add_node("human_screening_node", human_screening_node)
    workflow.add_node("methodologist_node", methodologist_node)
    workflow.add_node("human_bias_node", human_bias_node)
    workflow.add_node("synthesizer_node", synthesizer_node)

    workflow.set_entry_point("pi_coordinator_node")
    workflow.add_conditional_edges(
        "pi_coordinator_node", route_after_protocol, {"miner_node": "miner_node", END: END}
    )
    workflow.add_conditional_edges(
        "miner_node", route_after_miner, {"human_screening_node": "human_screening_node", END: END}
    )
    workflow.add_conditional_edges(
        "human_screening_node", route_after_screening, {"methodologist_node": "methodologist_node", END: END}
    )
    workflow.add_conditional_edges(
        "methodologist_node",
        route_after_auditor,
        {"human_bias_node": "human_bias_node", "synthesizer_node": "synthesizer_node"},
    )
    workflow.add_edge("human_bias_node", "synthesizer_node")
    workflow.add_edge("synthesizer_node", END)

    return workflow.compile(checkpointer=checkpointer)

import asyncio
from hypothesis import given, strategies as st
from app.services.brain_service import brain_service

@given(
    prompt=st.text(min_size=0, max_size=500),
    mode=st.sampled_from(["browser", "notepad", "assistant", "unknown"]),
)
def test_brain_service_never_crashes_on_arbitrary_input(prompt: str, mode: str):
    """Property-Based Test: Guarantees BrainService always returns a non-empty string for any input."""
    result = asyncio.run(brain_service.process_prompt(prompt, mode))
    assert isinstance(result, str)
    assert len(result) > 0
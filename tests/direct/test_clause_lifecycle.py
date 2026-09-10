"""Clause lifecycle, executed against the real contract on GenVM.

Every check here runs contracts/DefaultPolarityGuard.py inside a real GenVM
build through genlayer-test Direct Mode. Nothing is stubbed and no contract
logic is re-implemented, so these cannot drift from the deployed source.
"""
import json
import pytest
from conftest import CONTRACT, GENVM_VERSION

ANY = r".*narrow semantic comparison.*"
PRESERVED = json.dumps({"verdict": "DEFAULT_PRESERVED"})
FLIPPED = json.dumps({"verdict": "DEFAULT_FLIPPED"})

BASE = "A 30-day trial ends when the trial period expires. Continued service requires the customer to send a renewal request."
R_OK = "Trial access stops on day 30. To continue service after that date, the customer must submit a renewal request."
R_BAD = "After day 30, the trial automatically converts to a paid subscription unless the customer sends a cancellation request."


def clause(contract, n=1):
    return json.loads(contract.get_clause(n)) if isinstance(contract.get_clause(n), str) else contract.get_clause(n)


def mk(direct_vm, direct_deploy, owner):
    c = direct_deploy(CONTRACT, sdk_version=GENVM_VERSION)
    direct_vm.sender = owner
    c.create_clause(BASE)
    return c


def test_create_then_preserved_then_flipped(direct_vm, direct_deploy, direct_alice):
    c = mk(direct_vm, direct_deploy, direct_alice)
    st = clause(c)
    assert st["active_version"] == 1 and st["version_count"] == 1
    assert st["attempt_count"] == 0 and st["semantic_eval_count"] == 0
    assert st["default_flip_blocks"] == 0
    assert st["baseline_text"] == BASE

    direct_vm.clear_mocks(); direct_vm.mock_llm(ANY, PRESERVED)
    c.propose_rewrite(1, R_OK)
    st = clause(c)
    assert st["active_version"] == 2 and st["version_count"] == 2
    assert st["attempt_count"] == 1 and st["semantic_eval_count"] == 1
    assert st["default_flip_blocks"] == 0
    assert st["active_text"] == R_OK

    direct_vm.clear_mocks(); direct_vm.mock_llm(ANY, FLIPPED)
    c.propose_rewrite(1, R_BAD)
    st = clause(c)
    assert st["active_version"] == 2, "a flipped rewrite must not activate"
    assert st["version_count"] == 2, "a flipped rewrite must not append a version"
    assert st["attempt_count"] == 2 and st["semantic_eval_count"] == 2
    assert st["default_flip_blocks"] == 1


def test_owner_only(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = mk(direct_vm, direct_deploy, direct_alice)
    direct_vm.clear_mocks(); direct_vm.mock_llm(ANY, PRESERVED)
    direct_vm.sender = direct_bob
    with pytest.raises(Exception, match="Only the clause owner"):
        c.propose_rewrite(1, R_OK)


def test_exact_cache_reuse_does_not_spend_budget(direct_vm, direct_deploy, direct_alice):
    c = mk(direct_vm, direct_deploy, direct_alice)
    direct_vm.clear_mocks(); direct_vm.mock_llm(ANY, FLIPPED)
    c.propose_rewrite(1, R_BAD)
    a = clause(c)
    direct_vm.clear_mocks()          # no model armed: a fresh eval would now fail
    c.propose_rewrite(1, R_BAD)
    b = clause(c)
    assert a["semantic_eval_count"] == 1
    assert b["semantic_eval_count"] == 1, "an exact cache hit must not spend budget"
    assert b["attempt_count"] == 2, "but it is still recorded as an attempt"
    assert b["default_flip_blocks"] == 2, "and still counts as a block"


def test_baseline_stays_v1_across_a_chain(direct_vm, direct_deploy, direct_alice):
    """Salami: after v2 is active, the next candidate must still be judged
    against v1, not v2."""
    c = mk(direct_vm, direct_deploy, direct_alice)
    direct_vm.clear_mocks(); direct_vm.mock_llm(ANY, PRESERVED)
    c.propose_rewrite(1, R_OK)
    c.propose_rewrite(1, "A different third wording that still needs a renewal request from the customer.")
    at = json.loads(c.get_attempt(1, 2)) if isinstance(c.get_attempt(1, 2), str) else c.get_attempt(1, 2)
    assert at["base_version"] == 2, "the active version had moved on"
    assert at["semantic_baseline_version"] == 1, "yet the comparison stays anchored to v1"
    assert at["resulting_version"] == 3


def test_cross_clause_cache_isolation(direct_vm, direct_deploy, direct_alice, direct_bob):
    c = mk(direct_vm, direct_deploy, direct_alice)
    direct_vm.sender = direct_bob
    c.create_clause(BASE)                      # clause 2, same baseline text
    direct_vm.clear_mocks(); direct_vm.mock_llm(ANY, FLIPPED)
    direct_vm.sender = direct_alice
    c.propose_rewrite(1, R_BAD)                # caches FLIPPED for clause 1
    direct_vm.clear_mocks()                    # no model armed
    direct_vm.sender = direct_bob
    with pytest.raises(Exception):
        c.propose_rewrite(2, R_BAD)            # must NOT reuse clause 1's verdict

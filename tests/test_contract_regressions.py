from pathlib import Path
import ast, hashlib
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'contracts'/'DefaultPolarityGuard.py'
EXPECTED='1f5207a086131aeb81e1e6f7044e338949e4ba49e42fea04ed8d610d64d58e09'
text=SRC.read_text(encoding='utf-8')
assert hashlib.sha256(SRC.read_bytes()).hexdigest()==EXPECTED
ast.parse(text)
checks={
'immutable baseline binding':'baseline_record = self.versions[self._version_key(cid, 1)]',
'cross clause cache scope':'str(int(clause_id))',
'owner boundary':'Only the clause owner may propose a rewrite',
'semantic eval cap':'MAX_SEMANTIC_EVALS_PER_CLAUSE = 8',
'malformed json rejection':'Malformed validator JSON',
'exact schema rejection':'Invalid validator output schema',
'blocked consequence':'clause.default_flip_blocks = u256(',
'preserved consequence':'clause.active_version = new_version',
}
for name,needle in checks.items(): assert needle in text, name
print(f'CONTRACT REGRESSION CHECKS PASS {len(checks)}/{len(checks)}')

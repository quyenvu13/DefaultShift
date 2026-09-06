import {
  CONTRACT_ADDRESS,
  CONTRACT_EXPLORER_URL,
  CONTRACT_SHA256,
  cleanError,
  createClauseTx,
  executionOutcome,
  proposeRewriteTx,
  readAttempt,
  readAttempts,
  readClause,
  readConfig,
  shortAddress,
  txExplorerUrl,
  waitFinalized,
} from './genlayer.js'

const state = { account: '', config: null, clause: null, attempts: [], cachedRewriteTexts: new Set(), busy: false, txHash: '', txOutcome: null }
const $ = (id) => document.getElementById(id)
const isOwner = () => state.account && state.clause && state.account.toLowerCase() === String(state.clause.owner).toLowerCase()
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (ch) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]))

function shell() {
  $('app').innerHTML = `
    <div class="site-shell">
      <header class="topbar">
        <a class="brand" href="#overview" aria-label="DefaultShift home">
          <img src="/logo.svg" alt="" />
          <span><strong>DefaultShift</strong><small>Default outcome guard</small></span>
        </a>
        <div class="network-pill"><span></span> GenLayer StudioNet</div>
        <div class="top-actions">
          <a class="ghost-btn" href="${CONTRACT_EXPLORER_URL}" target="_blank" rel="noreferrer">Explorer ↗</a>
          <button id="walletButton" class="wallet-btn">Connect wallet</button>
        </div>
      </header>

      <nav class="subnav" aria-label="Primary">
        <a href="#overview" data-route="overview">Overview</a>
        <a href="#create" data-route="create">Create clause</a>
        <a href="#inspect" data-route="inspect">Inspect & rewrite</a>
        <a href="#verification" data-route="verification">Verification</a>
      </nav>

      <main>
        <section id="route-overview" class="route"></section>
        <section id="route-create" class="route hidden"></section>
        <section id="route-inspect" class="route hidden"></section>
        <section id="route-verification" class="route hidden"></section>
      </main>
    </div>`

  renderOverview(); renderCreate(); renderInspect(); renderVerification(); bindShell(); route()
}

function renderOverview() {
  $('route-overview').innerHTML = `
    <div class="hero-wrap">
      <div class="hero-copy">
        <div class="eyebrow">IMMUTABLE BASELINE · SEMANTIC GUARD</div>
        <h1>Keep the default.<br><em>Change the wording.</em></h1>
        <p>DefaultShift asks validators one narrow question: if nobody takes another affirmative action, does a proposed rewrite preserve the same operational outcome as immutable version 1?</p>
        <div class="hero-actions"><a class="primary-btn" href="#create">Create a clause</a><a class="text-link" href="#verification">See the boundary →</a></div>
      </div>
      <div class="shift-lens" aria-label="DefaultShift mechanism illustration">
        <div class="lens-top"><span>BASELINE v1</span><span class="lens-lock">IMMUTABLE</span></div>
        <div class="rail"><div class="rail-card baseline"><small>NO FURTHER ACTION</small><strong>Trial ends</strong></div><div class="rail-arrow">→</div><div class="lens-orb"><span>?</span><small>semantic<br>comparison</small></div><div class="rail-arrow">→</div><div class="rail-card candidate"><small>PROPOSED REWRITE</small><strong>Outcome?</strong></div></div>
        <div class="lens-branch"><div><b>DEFAULT_PRESERVED</b><span>append + activate</span></div><div><b>DEFAULT_FLIPPED</b><span>block activation</span></div></div>
      </div>
    </div>
    <div class="metrics">
      <article><span>Live contract</span><strong>${shortAddress(CONTRACT_ADDRESS, 9, 7)}</strong><small>runtime-verified Project deployment</small></article>
      <article><span>Clauses</span><strong id="metricClauses">—</strong><small>on-chain</small></article>
      <article><span>Semantic budget</span><strong>8</strong><small>fresh evaluations / clause</small></article>
      <article><span>Baseline</span><strong>v1</strong><small>always compared</small></article>
    </div>
    <div class="explain-grid">
      <article class="paper-card"><span class="card-number">01</span><h2>The baseline never moves.</h2><p>Every candidate is compared against the clause's immutable version 1, not the latest accepted rewrite. This closes sequential salami drift.</p></article>
      <article class="paper-card"><span class="card-number">02</span><h2>Validators answer only the narrow part.</h2><p>They classify default polarity. The contract itself owns activation, blocking, counters, cache scope, limits, and version state.</p></article>
      <article class="paper-card"><span class="card-number">03</span><h2>Technical failure is not semantic truth.</h2><p>Malformed output, provider failure, or non-convergence cannot be cached as a verdict or mutate clause state.</p></article>
    </div>`
}

function renderCreate() {
  $('route-create').innerHTML = `
    <div class="page-head"><div><div class="eyebrow">CREATE</div><h1>Anchor a clause.</h1><p>Version 1 becomes the immutable semantic baseline. It cannot be edited later.</p></div><div class="page-index">01 / 03</div></div>
    <div class="action-layout">
      <section class="action-panel">
        <label for="initialClause">Initial clause</label>
        <textarea id="initialClause" maxlength="4000" placeholder="Enter the exact clause text…"></textarea>
        <div class="field-meta"><span>Stored exactly on-chain</span><span id="initialCount">0/4000</span></div>
        <button id="createClauseButton" class="primary-btn wide">Create immutable baseline</button>
      </section>
      <aside class="side-note"><span class="note-rule"></span><h3>Before signing</h3><p>This action creates version 1 and assigns ownership to the connected wallet. The form is intentionally empty by default.</p><dl><div><dt>Value</dt><dd>0 GEN</dd></div><div><dt>Baseline</dt><dd>Version 1</dd></div><div><dt>Global admin</dt><dd>None</dd></div></dl></aside>
    </div>
    <div id="createTx" class="tx-box hidden"></div>`
}

function renderInspect() {
  $('route-inspect').innerHTML = `
    <div class="page-head"><div><div class="eyebrow">INSPECT & REWRITE</div><h1>Read first. Then propose.</h1><p>The UI re-reads accepted contract state before and after every write.</p></div><div class="page-index">02 / 03</div></div>
    <div class="inspect-search"><input id="clauseId" inputmode="numeric" placeholder="Clause ID"/><button id="inspectButton" class="secondary-btn">Inspect clause</button></div>
    <div id="inspectError" class="inline-error hidden"></div>
    <div id="emptyClause" class="empty-state"><div class="empty-mark">↔</div><strong>No clause loaded</strong><span>Enter an on-chain clause ID to inspect baseline, active version, and attempts.</span></div>
    <div id="clauseWorkspace" class="hidden">
      <div class="clause-grid">
        <article class="clause-card baseline-card"><div class="card-kicker">IMMUTABLE BASELINE · v1</div><p id="baselineText"></p></article>
        <article class="clause-card active-card"><div class="card-kicker">ACTIVE · <span id="activeVersion"></span></div><p id="activeText"></p></article>
      </div>
      <div class="clause-meta">
        <div><span>Owner</span><strong id="clauseOwner">—</strong></div><div><span>Versions</span><strong id="versionCount">—</strong></div><div><span>Attempts</span><strong id="attemptCount">—</strong></div><div><span>Fresh semantic evals</span><strong id="semanticCount">—</strong></div><div><span>Flip blocks</span><strong id="blockCount">—</strong></div>
      </div>
      <div class="rewrite-layout">
        <section id="rewritePanel" class="action-panel">
          <div class="panel-title"><div><div class="eyebrow">PROPOSE</div><h2>Candidate rewrite</h2></div><span id="ownerBadge" class="owner-badge">Owner only</span></div>
          <textarea id="rewriteText" maxlength="4000" placeholder="Enter a new rewrite…"></textarea>
          <div class="field-meta"><span>Compared to immutable v1</span><span id="rewriteCount">0/4000</span></div>
          <button id="rewriteButton" class="primary-btn wide">Evaluate rewrite</button>
          <div id="rewriteGate" class="gate-note"></div>
        </section>
        <section class="history-panel"><div class="panel-title"><div><div class="eyebrow">ATTEMPT HISTORY</div><h2>Deterministic consequences</h2></div></div><div id="attemptHistory" class="attempt-list"></div></section>
      </div>
    </div>
    <div id="inspectTx" class="tx-box hidden"></div>`
}

function renderVerification() {
  $('route-verification').innerHTML = `
    <div class="page-head"><div><div class="eyebrow">VERIFICATION</div><h1>What is semantic. What is not.</h1><p>The contract keeps the semantic question narrow and every consequence deterministic.</p></div><div class="page-index">03 / 03</div></div>
    <div class="boundary-table">
      <div class="boundary-row head"><span>Layer</span><span>Responsibility</span><span>Failure behavior</span></div>
      <div class="boundary-row"><strong>Validator</strong><span>Does the rewrite preserve the no-further-action outcome of immutable v1?</span><span>Ambiguity → DEFAULT_FLIPPED</span></div>
      <div class="boundary-row"><strong>Contract</strong><span>Owner checks, cache scope, eval budget, append/activate, block counter, version history.</span><span>Invalid/malformed/non-convergent execution → no state write</span></div>
      <div class="boundary-row"><strong>Frontend</strong><span>Wallet flow, accepted-state reads, receipt monitoring, postcondition rendering.</span><span>Never treats FINALIZED alone as execution success</span></div>
    </div>
    <div class="verification-grid">
      <article class="verify-card"><span>Contract address</span><code>${CONTRACT_ADDRESS}</code><a href="${CONTRACT_EXPLORER_URL}" target="_blank" rel="noreferrer">Open Explorer ↗</a></article>
      <article class="verify-card"><span>Exact source SHA256</span><code>${CONTRACT_SHA256}</code><small>contracts/DefaultPolarityGuard.py</small></article>
      <article class="verify-card"><span>Runtime status</span><strong>Runtime verified on StudioNet</strong><small>Executed via frontend: DEFAULT_PRESERVED activation, DEFAULT_FLIPPED blocking, and exact cache reuse; Explorer shows FINALIZED + GenVM SUCCESS for each write.</small></article>
    </div>
    <div class="truth-banner"><strong>FINALIZED ≠ success by itself.</strong><span>Writes are treated as successful only after GenVM execution evidence and matching accepted-state postconditions.</span></div>`
}

function bindShell() {
  $('walletButton').addEventListener('click', connectWallet)
  $('initialClause').addEventListener('input', () => $('initialCount').textContent = `${$('initialClause').value.length}/4000`)
  $('createClauseButton').addEventListener('click', createClause)
  $('inspectButton').addEventListener('click', () => loadClause())
  $('clauseId').addEventListener('keydown', (e) => { if (e.key === 'Enter') loadClause() })
  $('rewriteText').addEventListener('input', () => { $('rewriteCount').textContent = `${$('rewriteText').value.length}/4000`; updateRewriteGate() })
  $('rewriteButton').addEventListener('click', proposeRewrite)
  window.addEventListener('hashchange', route)
  window.ethereum?.on?.('accountsChanged', (accounts) => { state.account = accounts?.[0] || ''; updateWallet(); renderClauseState() })
}

function route() {
  const name = ['overview','create','inspect','verification'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'overview'
  for (const el of document.querySelectorAll('.route')) el.classList.add('hidden')
  $(`route-${name}`).classList.remove('hidden')
  for (const a of document.querySelectorAll('[data-route]')) a.classList.toggle('active', a.dataset.route === name)
  window.scrollTo({ top: 0, behavior: 'instant' })
}

async function connectWallet() {
  try {
    if (!window.ethereum) throw new Error('MetaMask is not installed.')
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' })
    state.account = accounts?.[0] || ''
    updateWallet(); renderClauseState()
  } catch (error) { showTx('inspectTx', 'error', 'Wallet connection', cleanError(error)) }
}

function updateWallet() { $('walletButton').textContent = state.account ? shortAddress(state.account, 7, 5) : 'Connect wallet' }
function showTx(id, tone, title, message, hash = '') {
  const el = $(id); el.className = `tx-box ${tone}`; el.innerHTML = `<span class="tx-dot"></span><div><strong>${esc(title)}</strong><p>${esc(message)}</p>${hash ? `<a href="${txExplorerUrl(hash)}" target="_blank" rel="noreferrer">${esc(shortAddress(hash, 12, 10))} ↗</a>` : ''}</div>`
}
function setBusy(value) { state.busy = value; for (const id of ['createClauseButton','inspectButton','rewriteButton']) if ($(id)) $(id).disabled = value }

async function refreshConfig() {
  try { state.config = await readConfig(); $('metricClauses').textContent = String(state.config.clause_count); return state.config } catch { return null }
}

async function locateCreatedClause(beforeCount, owner, expectedText) {
  const config = await refreshConfig(); if (!config) return null
  for (let id = Number(beforeCount) + 1; id <= Number(config.clause_count); id += 1) {
    try { const c = await readClause(id); if (String(c.owner).toLowerCase() === String(owner).toLowerCase() && c.baseline_text === expectedText) return c } catch {}
  }
  return null
}

async function createClause() {
  if (state.busy) return
  const text = $('initialClause').value.trim()
  if (!state.account) return showTx('createTx','error','Create clause','Connect MetaMask first.')
  if (!text) return showTx('createTx','error','Create clause','Initial clause is required.')
  setBusy(true); let hash = ''
  try {
    const before = state.config || await refreshConfig(); if (!before) throw new Error('Could not read contract config before sending.')
    showTx('createTx','pending','Waiting for signature','Confirm the transaction in MetaMask.')
    hash = await createClauseTx(state.account, text)
    showTx('createTx','pending','Transaction sent','Waiting for FINALIZED and GenVM execution evidence.', hash)
    const receipt = await waitFinalized(hash); const outcome = executionOutcome(receipt)
    if (outcome.ok === false) throw new Error(`FINALIZED with ${outcome.name}; state is not treated as successful.`)
    const created = await locateCreatedClause(Number(before.clause_count), state.account, text)
    if (outcome.ok !== true) {
      return showTx('createTx','warning','Execution needs verification', created ? `Accepted state contains clause #${created.clause_id}, but execution success is not claimed without GenVM result. Verify Explorer.` : 'GenVM result unavailable; no success is claimed.', hash)
    }
    if (!created) throw new Error('Execution reported success but the expected clause was not found in accepted state.')
    $('initialClause').value = ''; $('initialCount').textContent = '0/4000'; $('clauseId').value = String(created.clause_id)
    showTx('createTx','success','Clause created', `FINALIZED · ${outcome.name} · accepted state re-read as clause #${created.clause_id}.`, hash)
  } catch (error) { showTx('createTx','error','Create clause failed', cleanError(error), hash) } finally { setBusy(false) }
}

async function loadClause(id = $('clauseId').value) {
  const parsed = Number(id); if (!Number.isInteger(parsed) || parsed <= 0) return inlineError('Enter a valid clause ID greater than 0.')
  try {
    inlineError(''); state.clause = await readClause(parsed); $('clauseId').value = String(parsed)
    state.attempts = Number(state.clause.attempt_count) ? await readAttempts(parsed, Math.max(1, Number(state.clause.attempt_count) - 49), 50) : []
    state.cachedRewriteTexts = new Set([state.clause.baseline_text])
    if (Number(state.clause.semantic_eval_count) >= 8 && Number(state.clause.attempt_count) > 0) {
      const ids = Array.from({ length: Number(state.clause.attempt_count) }, (_, i) => i + 1)
      for (let offset = 0; offset < ids.length; offset += 10) {
        const batch = await Promise.all(ids.slice(offset, offset + 10).map(async (attemptId) => {
          try { return await readAttempt(parsed, attemptId) } catch { return null }
        }))
        for (const attempt of batch) if (attempt?.rewrite_text) state.cachedRewriteTexts.add(attempt.rewrite_text)
      }
    }
    renderClauseState(); return state.clause
  } catch (error) { state.clause = null; state.attempts = []; state.cachedRewriteTexts = new Set(); renderClauseState(); inlineError(cleanError(error)); return null }
}

function inlineError(message) { $('inspectError').textContent = message; $('inspectError').classList.toggle('hidden', !message) }

function renderClauseState() {
  const c = state.clause; $('emptyClause').classList.toggle('hidden', Boolean(c)); $('clauseWorkspace').classList.toggle('hidden', !c)
  if (!c) return
  $('baselineText').textContent = c.baseline_text; $('activeText').textContent = c.active_text; $('activeVersion').textContent = `v${c.active_version}`
  $('clauseOwner').textContent = shortAddress(c.owner, 9, 7); $('versionCount').textContent = String(c.version_count); $('attemptCount').textContent = String(c.attempt_count); $('semanticCount').textContent = `${c.semantic_eval_count} / 8`; $('blockCount').textContent = String(c.default_flip_blocks)
  $('ownerBadge').textContent = isOwner() ? 'Connected owner' : 'Owner only'; $('ownerBadge').classList.toggle('ok', isOwner())
  renderAttempts(); updateRewriteGate()
}

function renderAttempts() {
  const list = $('attemptHistory')
  if (!state.attempts.length) { list.innerHTML = '<div class="no-attempts">No rewrite attempts yet.</div>'; return }
  list.innerHTML = [...state.attempts].reverse().map((a) => `<article class="attempt-row ${a.accepted ? 'accepted' : 'blocked'}"><div><span>#${a.attempt_id}</span><strong>${esc(a.verdict)}</strong></div><div class="attempt-meta"><span>${a.used_cache ? 'cache hit' : 'fresh semantic eval'}</span><span>${a.accepted ? `activated v${a.resulting_version}` : 'blocked'}</span></div></article>`).join('')
}

function updateRewriteGate() {
  if (!state.clause) return
  const c = state.clause; const text = $('rewriteText').value.trim(); let reason = ''
  if (!state.account) reason = 'Connect the clause owner wallet to propose.'
  else if (!isOwner()) reason = 'Only the on-chain clause owner may propose a rewrite.'
  else if (Number(c.attempt_count) >= 100) reason = 'Attempt limit reached.'
  else if (Number(c.version_count) >= 20) reason = 'Version limit reached.'
  else if (text && text === c.active_text) reason = 'Rewrite matches the active clause and will be rejected deterministically.'
  else if (Number(c.semantic_eval_count) >= 8 && text && !state.cachedRewriteTexts.has(text)) reason = 'Fresh semantic evaluation budget is exhausted. Only an exact previously evaluated candidate or baseline restoration can execute.'
  $('rewriteGate').textContent = reason; $('rewriteButton').disabled = state.busy || !text || Boolean(reason) || !isOwner()
}

async function proposeRewrite() {
  if (state.busy || !state.clause) return
  const id = Number(state.clause.clause_id); const text = $('rewriteText').value.trim()
  if (!text) return
  const before = { ...state.clause }; setBusy(true); let hash = ''
  try {
    showTx('inspectTx','pending','Waiting for signature','Confirm the rewrite transaction in MetaMask.')
    hash = await proposeRewriteTx(state.account, id, text)
    showTx('inspectTx','pending','Rewrite submitted','Waiting for FINALIZED, GenVM execution evidence, and post-state.', hash)
    const receipt = await waitFinalized(hash); const outcome = executionOutcome(receipt)
    const after = await loadClause(id)
    if (outcome.ok === false) throw new Error(`FINALIZED with ${outcome.name}; accepted state was re-read and no success is claimed.`)
    if (outcome.ok !== true) return showTx('inspectTx','warning','Execution needs verification','GenVM result unavailable from RPC. Accepted state was re-read; verify Explorer before another write.', hash)
    if (!after || Number(after.attempt_count) !== Number(before.attempt_count) + 1) throw new Error('Execution reported success but expected attempt_count postcondition was not observed.')
    const attempt = await readAttempt(id, Number(after.attempt_count))
    state.attempts = Number(after.attempt_count) ? await readAttempts(id, Math.max(1, Number(after.attempt_count) - 49), 50) : []
    renderClauseState(); $('rewriteText').value = ''; $('rewriteCount').textContent = '0/4000'; updateRewriteGate()
    const consequence = attempt.accepted ? `activated version ${attempt.resulting_version}` : 'blocked; active version unchanged'
    showTx('inspectTx','success','Rewrite finalized', `${attempt.verdict} · ${attempt.used_cache ? 'cache hit' : 'fresh semantic eval'} · ${consequence}.`, hash)
  } catch (error) { showTx('inspectTx','error','Rewrite failed', cleanError(error), hash); await loadClause(id) } finally { setBusy(false); updateRewriteGate() }
}

shell(); refreshConfig(); updateWallet()

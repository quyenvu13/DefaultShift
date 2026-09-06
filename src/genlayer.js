import { createClient } from 'https://esm.unpkg.com/genlayer-js@1.1.8'
import { studionet } from 'https://esm.unpkg.com/genlayer-js@1.1.8/chains'
import { ExecutionResult, TransactionStatus } from 'https://esm.unpkg.com/genlayer-js@1.1.8/types'

export const CONTRACT_ADDRESS = '0xD324ADB41211F1eB2e4889d04cD20BaA5b9c3b3E'
export const EXPLORER_BASE = 'https://explorer-studio.genlayer.com'
export const CONTRACT_EXPLORER_URL = `${EXPLORER_BASE}/address/${CONTRACT_ADDRESS}`
export const CONTRACT_SHA256 = '1f5207a086131aeb81e1e6f7044e338949e4ba49e42fea04ed8d610d64d58e09'

export const readClient = createClient({ chain: studionet })

export function makeWriteClient(account) {
  if (!window.ethereum) throw new Error('MetaMask was not detected in this browser.')
  return createClient({ chain: studionet, account, provider: window.ethereum })
}

export async function ensureStudioNet(account) {
  const client = makeWriteClient(account)
  await client.connect('studionet')
  return client
}

export async function readConfig() {
  return readClient.readContract({ address: CONTRACT_ADDRESS, functionName: 'get_config', args: [], stateStatus: 'accepted' })
}

export async function readClause(clauseId) {
  return readClient.readContract({ address: CONTRACT_ADDRESS, functionName: 'get_clause', args: [Number(clauseId)], stateStatus: 'accepted' })
}

export async function readVersion(clauseId, version) {
  return readClient.readContract({ address: CONTRACT_ADDRESS, functionName: 'get_version', args: [Number(clauseId), Number(version)], stateStatus: 'accepted' })
}

export async function readAttempt(clauseId, attemptId) {
  return readClient.readContract({ address: CONTRACT_ADDRESS, functionName: 'get_attempt', args: [Number(clauseId), Number(attemptId)], stateStatus: 'accepted' })
}

export async function readAttempts(clauseId, fromId = 1, count = 50) {
  return readClient.readContract({ address: CONTRACT_ADDRESS, functionName: 'get_attempts', args: [Number(clauseId), Number(fromId), Number(count)], stateStatus: 'accepted' })
}

export async function createClauseTx(account, text) {
  const client = await ensureStudioNet(account)
  return client.writeContract({ address: CONTRACT_ADDRESS, functionName: 'create_clause', args: [text], value: 0n })
}

export async function proposeRewriteTx(account, clauseId, text) {
  const client = await ensureStudioNet(account)
  return client.writeContract({ address: CONTRACT_ADDRESS, functionName: 'propose_rewrite', args: [Number(clauseId), text], value: 0n })
}

function rawLeaderExecution(value) {
  const consensus = value?.consensus_data || value?.consensusData || value?.transaction?.consensus_data || value?.transaction?.consensusData
  let leader = consensus?.leader_receipt || consensus?.leaderReceipt
  if (Array.isArray(leader)) leader = leader[0]
  return String(leader?.execution_result || leader?.executionResult || '').toUpperCase()
}

function executionName(value) {
  return String(value?.txExecutionResultName || value?.executionResultName || value?.transaction?.txExecutionResultName || value?.transaction?.executionResultName || '').toUpperCase()
}

export async function waitFinalized(txHash) {
  const receipt = await readClient.waitForTransactionReceipt({ hash: txHash, status: TransactionStatus.FINALIZED, interval: 5000, retries: 240, fullTransaction: true })
  if (executionOutcome(receipt).ok !== null) return receipt
  try {
    const transaction = await readClient.getTransaction({ hash: txHash })
    return { ...receipt, _transaction: transaction }
  } catch {
    return receipt
  }
}

export function executionOutcome(receipt) {
  for (const source of [receipt, receipt?._transaction]) {
    const name = executionName(source)
    if (name === ExecutionResult.FINISHED_WITH_RETURN || name === 'FINISHED_WITH_RETURN') return { ok: true, name: 'FINISHED_WITH_RETURN', evidence: 'SDK' }
    if (name === ExecutionResult.FINISHED_WITH_ERROR || name === 'FINISHED_WITH_ERROR') return { ok: false, name: 'FINISHED_WITH_ERROR', evidence: 'SDK' }
    const raw = rawLeaderExecution(source)
    if (raw === 'SUCCESS' || raw === 'FINISHED_WITH_RETURN') return { ok: true, name: 'FINISHED_WITH_RETURN', evidence: 'LEADER_RECEIPT' }
    if (raw === 'ERROR' || raw === 'FINISHED_WITH_ERROR') return { ok: false, name: 'FINISHED_WITH_ERROR', evidence: 'LEADER_RECEIPT' }
  }
  return { ok: null, name: 'EXECUTION_RESULT_UNAVAILABLE', evidence: 'NONE' }
}

export function txExplorerUrl(hash) { return `${EXPLORER_BASE}/tx/${hash}` }
export function shortAddress(value, left = 6, right = 4) {
  if (!value) return '—'
  if (value.length <= left + right + 3) return value
  return `${value.slice(0, left)}…${value.slice(-right)}`
}
export function cleanError(error) {
  return String(error?.shortMessage || error?.message || error || 'Unknown error')
    .replace(/^Error:\s*/i, '')
    .replace(/\n\s*Details:[\s\S]*$/i, '')
    .trim()
}

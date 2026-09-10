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

export const CHAIN_ID = 61999
const CHAIN_ID_HEX = `0x${CHAIN_ID.toString(16)}`
const WALLET_RPC = 'https://studio.genlayer.com/api'

function errorCode(error) {
  const code = error?.code ?? error?.cause?.code
  return typeof code === 'number' ? code : Number(code)
}

async function switchChain() {
  await window.ethereum.request({
    method: 'wallet_switchEthereumChain',
    params: [{ chainId: CHAIN_ID_HEX }],
  })
}

async function addChain() {
  await window.ethereum.request({
    method: 'wallet_addEthereumChain',
    params: [{
      chainId: CHAIN_ID_HEX,
      chainName: studionet.name || 'GenLayer Studio Network',
      // The wallet fetches this itself, so it must be an absolute URL.
      rpcUrls: [WALLET_RPC],
      nativeCurrency: studionet.nativeCurrency ?? { name: 'GEN Token', symbol: 'GEN', decimals: 18 },
      blockExplorerUrls: [EXPLORER_BASE],
    }],
  })
}

/**
 * Put the wallet on StudioNet without touching MetaMask Snaps.
 *
 * This deliberately does NOT call `client.connect('studionet')`. That SDK helper
 * does two unrelated things: it switches the network, and it installs the
 * GenLayer MetaMask Snap. Reading genlayer-js 1.1.8 makes the second explicit —
 * it calls `wallet_getSnaps`, then `wallet_requestSnaps` when the Snap is absent.
 * A wallet that does not implement the Snaps API answers `wallet_getSnaps` with
 * "method [wallet_getSnaps] doesn't has corresponding handler", and every write
 * in this app fails before a transaction is ever built. That is the exact error a
 * reviewer reported on Create clause.
 *
 * Signing never needs that Snap: writes go out through `eth_sendTransaction` on
 * the injected provider. So only the network half is kept.
 *
 * The switch also has to happen here rather than being left to the SDK.
 * `assertChainMatch` in the same file opens with `if (chainConfig.isStudio) return;`
 * and `studionet.isStudio` is true, so the SDK does not verify the wallet's
 * network before sending. Without this, a wallet left on another chain would be
 * asked to sign against it.
 */
export async function ensureStudioNet(account) {
  const client = makeWriteClient(account)

  const current = await window.ethereum.request({ method: 'eth_chainId' })
  if (typeof current === 'string' && current.toLowerCase() === CHAIN_ID_HEX) return client

  try {
    await switchChain()
    return client
  } catch (error) {
    if (errorCode(error) === 4001) {
      throw new Error('Network switch was rejected. Switch your wallet to GenLayer Studio Network to continue.')
    }
    if (errorCode(error) !== 4902) throw error
  }

  // 4902: the network is unknown to this wallet. Add it, then switch.
  try {
    await addChain()
    await switchChain()
  } catch (error) {
    if (errorCode(error) === 4001) {
      throw new Error(`Adding GenLayer Studio Network was rejected. Add chain ${CHAIN_ID} in your wallet to continue.`)
    }
    throw error
  }

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

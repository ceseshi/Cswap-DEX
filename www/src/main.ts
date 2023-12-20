import { createWeb3Modal } from '@web3modal/wagmi'
import { walletConnectProvider, EIP6963Connector  } from '@web3modal/wagmi'
import { configureChains, createConfig } from '@wagmi/core'
import { getNetwork, watchNetwork, switchNetwork, watchBlockNumber, disconnect } from '@wagmi/core'
import { getAccount, fetchBalance, fetchToken, multicall, readContract, writeContract, prepareWriteContract } from '@wagmi/core'
import { watchMulticall, watchAccount, watchContractEvent } from '@wagmi/core'
import { publicProvider } from '@wagmi/core/providers/public'
import { jsonRpcProvider } from '@wagmi/core/providers/jsonRpc'
import { CoinbaseWalletConnector } from '@wagmi/connectors/coinbaseWallet'
import { InjectedConnector } from '@wagmi/connectors/injected'
import { WalletConnectConnector } from '@wagmi/connectors/walletConnect'
import { mainnet, sepolia } from '@wagmi/core/chains'

import CswapPoolManagerABI from '../abi/CswapPoolManager.json'
import CswapTokenPairABI from '../abi/CswapTokenPair.json'
import CswapTokenABI from '../abi/CswapToken.json'

import cswapLogo from '../src/logo-cswap.png'

import "/node_modules/bootstrap/scss/bootstrap.scss"

import './jquery.ts'
import '@popperjs/core'
import { Toast, Popover } from 'bootstrap'
import bootbox from 'bootbox'

bootbox.setDefaults({
  backdrop: true,
  closeButton: false,
  centerVertical: true,
  scrollable: true,
  swapButtonOrder: false
})

function popover(element:any, content:string) {
  let popover = new Popover(element, {
    content: content,
    placement: 'top'
  }) as any | null

  popover.show()

  let closePopover = () => {
    popover && popover.dispose()
    popover = null
  }

  setTimeout(() => $('body').one('click', closePopover))
  setTimeout(closePopover, 5000)
}

function toast(content:string) {
  let toastElement = $('#toastTemplate').clone(true).insertAfter('#toastTemplate') as any
  toastElement.prop('id', '')
  toastElement.html(toastElement.html().replace('%message%', content))

  let toast = new Toast(toastElement, {autohide:true}) as any
  toast.show()

  toastElement.on('hidden.bs.toast', () => {
    toast.dispose()
    toastElement.remove()
  });

  return toast;
}

function highlight(element:any) {
  element.addClass('highlight')
  setTimeout(() => element.removeClass('highlight'), 100)
}

// 1. Define constants
const projectId = import.meta.env.VITE_WC3_PROJECT_ID

const token0Address = import.meta.env.VITE_TOKEN0
const token1Address = import.meta.env.VITE_TOKEN1
const poolManagerAddress = import.meta.env.VITE_POOL
let token0:any
let token1:any

const feePct = 4
let reserves = [0, 0]
let tokenPairAddress:`0x${string}`
const tokenPairDecimals = 18
let userAddress:`0x${string}`
let userBalance:number = 0

import htmlTemplate from '../src/main.html?raw'
let template = htmlTemplate
template = template.replace(/{cswapLogo}/g, cswapLogo)
template = template.replace(/{token0Address}/g, token0Address)
template = template.replace(/{token1Address}/g, token1Address)
template = template.replace(/{poolManagerAddress}/g, poolManagerAddress)
template = template.replace(/{feePct}/g, feePct.toString())
$('#app').html(template)


declare global {
  interface Number {
    round(digits?:number): number
    floor(): number
  }
}
Number.prototype.round = function(digits:number) {
  return Math.floor(Number(this) * 10**digits) / 10**digits
}
Number.prototype.floor = function() {
  return Math.floor(Number(this))
}

/**
 * WEB3MODAL
 */
const { chains, publicClient } = (import.meta.env.MODE == 'development') ?
  configureChains([mainnet, sepolia], [
    jsonRpcProvider({rpc: () => ({http: `http://127.0.0.1:8545`})}),
    publicProvider(),
    walletConnectProvider({ projectId }),
  ]
  ) :
  configureChains([mainnet, sepolia], [
    publicProvider(),
    walletConnectProvider({ projectId }),
  ]
)

const metadata = {
  name: 'Web3Modal',
  description: 'Web3Modal',
  url: 'https://web3modal.com',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
}

// Get Wagmi config
const wagmiConfig = createConfig({
  autoConnect: true,
  connectors: [
    new WalletConnectConnector({ chains, options: { projectId, showQrModal: false, metadata } }),
    new EIP6963Connector({ chains }),
    new InjectedConnector({ chains, options: { shimDisconnect: true } }),
    new CoinbaseWalletConnector({ chains, options: { appName: metadata.name } })
  ],
  publicClient
})

// Create Web3Modal
const modal = createWeb3Modal({ wagmiConfig, projectId, chains })

function connectAccount() {
  if (getAccount().isConnected) {
    disconnect()
  } else {
    modal.open()
  }
}

/**
* DATA FUNCTIONS
*/
function getQuote(amount0:number, reserve0:number, reserve1:number) {
  return amount0 * reserve1 / reserve0
}

function getAmountOut(amountIn:any, reserveIn:any, reserveOut:any, feePct:number) {
  let amountInWithFee = BigInt(amountIn) * (BigInt(1000 - feePct*10))
  let numerator = amountInWithFee * BigInt(reserveOut)
  let denominator = BigInt(reserveIn) * BigInt(1000) + amountInWithFee
  let amountOut = numerator / denominator
  return Number(amountOut);
}

function getAmountIn(amountOut:any, reserveOut:any, reserveIn:any, feePct:number) {
  let amountOutWithoutFee = BigInt(amountOut) * (BigInt(1000))
  let numerator = amountOutWithoutFee * BigInt(reserveIn)
  let denominator = BigInt(reserveOut) * BigInt(1000 - feePct*10) + amountOutWithoutFee
  let amountIn = numerator / denominator
  return Number(amountIn);
}

/**
* WALLET FUNCTIONS
*/
let unwatchMulticallBalances:any

let getMulticallBalancesContracts:any = function() {
  return [{
    address: token0.address,
    functionName: 'balanceOf',
    abi: CswapTokenABI,
    args: [userAddress]
  }, {
    address: token1.address,
    functionName: 'balanceOf',
    abi: CswapTokenABI,
    args: [userAddress]
  }, {
    address: tokenPairAddress,
    functionName: 'balanceOf',
    abi: CswapTokenPairABI,
    args: [userAddress]
  }, {
    address: tokenPairAddress,
    functionName: 'totalSupply',
    abi: CswapTokenPairABI
  }, {
    address: tokenPairAddress,
    functionName: 'getReserves',
    abi: CswapTokenPairABI
  },{
    address: token0.address,
    functionName: 'claimed',
    abi: CswapTokenABI,
    args: [userAddress]
  }]
}

let parseMulticallBalances = function(results: any) {
  if (results[0].status == 'success') {
    setUserToken0Balance(Number(results[0].result))
  } else {
    setUserToken0Balance('err')
    console.log(results[0].error)
  }

  if (results[1].status == 'success') {
    setUserToken1Balance(Number(results[1].result))
  } else {
    setUserToken1Balance('err')
    console.log(results[1].error)
  }

  if (results[2].status == 'success' && results[3].status == 'success' && results[4].status == 'success') {
    let userPoolBalance = Number(results[2].result)
    let poolSupply = Number(results[3].result)
    reserves[0] = Number(results[4].result[0])
    reserves[1] = Number(results[4].result[1])
    let userAssetsToken0 = userPoolBalance * reserves[0] / poolSupply
    let userAssetsToken1 = userPoolBalance * reserves[1] / poolSupply

    setUserPoolBalance(userPoolBalance, userAssetsToken0, userAssetsToken1)
    setPoolLiquidity(poolSupply, reserves[0], reserves[1])
  } else {
    setUserPoolBalance('err')
    setPoolLiquidity('err')
    console.log(results[2].error || results[3].error || results[4].error)
  }

  if (results[5].status == 'success') {
    setAccountStatus(results[5].result ? 'claimed' : 'unclaimed')
  } else {
    setAccountStatus('error')
    console.log(results[5].error)
  }
}

function checkConnect() {

  let network = getNetwork()
  let account = getAccount()

  if (!network.chain || !account.isConnected) {
    connectAccount()
    return false
  }
  else if (account.status != 'connected') {
    bootbox.alert('Please <a href="" onclick="connectAccount();return false;">connect</a> yout wallet!')
    return false
  }
  else if (network.chain.id != sepolia.id) {
    switchNetwork({ chainId: sepolia.id })
    return false
  }

  return true
}

function checkUserBalance() {
  if (userBalance == 0) {
    // Recheck balance
    updateUserBalance(() => {
      if (userBalance == 0) {
        bootbox.alert('Seems you don\'t have any Sepolia ETH. Please get some from <a href="https://sepoliafaucet.com/" target="_blank">Alchemy Faucet</a> or <a href="https://sepolia-faucet.pk910.de/" target="_blank">PoW Faucet</a>')
      }
    })
    return false;
  }
  return true;
}

watchAccount(async account => {
  if (!account || !account.isConnected || account.status != 'connected') {
    userAddress = '0x'
    $('#btnConnect').show()
    $('#networkStatus').hide()
    $('#blockNumberWrapper').hide()
    $('#btnSwitchNetwork').hide()
    setAccountStatus('disconnected')
  } else {
    userAddress = account.address

    tokenPairAddress = await readContract({
      address: poolManagerAddress,
      functionName: 'tokenPair',
      abi: CswapPoolManagerABI
    }).catch(err => {
      console.error("tokenPairAddress not found:", (err.cause.name == "ContractFunctionZeroDataError") ? "verify poolManagerAddress" : err)
    }) as any

    token0 = await fetchToken({
      address: token0Address
    }).catch(err => {
      console.error("token0 contract not found:", err)
    }) as any

    token1 = await fetchToken({
      address: token1Address
    }).catch(err => {
      console.error("token1 contract not found:", err)
    }) as any

    if (!userAddress || !tokenPairAddress || !token0 || !token1) return

    $('.token0Symbol').text(token0.symbol)
    $('.token1Symbol').text(token1.symbol)

    $('#btnSell.active, #btnBuy.active').trigger('click')

    updateBalances()

    if (unwatchMulticallBalances) {
      unwatchMulticallBalances()
    }

    unwatchMulticallBalances = watchMulticall({
      contracts: getMulticallBalancesContracts(),
      listenToBlock: true
    }, (results: any) => {
      parseMulticallBalances(results)
    })
  }
})

watchNetwork(network => {
  if (!network.chain) {
    resetBalances('')
    return
  }

  if (network.chain.id != sepolia.id) {
    $('#btnSwitchNetwork').show()
    $('#btnConnect').hide()
    $('#networkStatus').hide()
    $('#blockNumberWrapper').hide()
  } else {
    $('#networkStatus').show()
    $('#networkName').text(network.chain.name)
    $('#blockNumberWrapper').show()
    $('#btnConnect').hide()
    $('#btnSwitchNetwork').hide()
  }
})

watchBlockNumber({
    chainId: sepolia.id,
    listen: true,
  },
  (blockNumber) => {
    $('#blockNumber').text(blockNumber.toString())
    highlight($('#blockNumber'))
  }
)

function updateBalances() {
  resetBalances('Loading...')

  if (!userAddress) {
    setUserToken0Balance('0')
    setUserToken1Balance('0')
    setUserPoolBalance('n/a')
    console.log("updateBalances: userAddress not found")
    return
  }

  if (!tokenPairAddress) {
    setUserPoolBalance('n/a')
    setPoolLiquidity('n/a')
    console.error("tokenPairAddress not found: verify poolManagerAddress")
    return
  }

  updateUserBalance()

  $('#btnGetBalances').find('.spinner').show()

  // Update all balances
  multicall({
    contracts: getMulticallBalancesContracts()
  }).then((results: any) => {
    $('#btnGetBalances').find('.spinner').hide()
    parseMulticallBalances(results)
  }).catch(err => {
    $('#btnGetBalances').find('.spinner').hide()
    setUserToken0Balance('err')
    setUserToken1Balance('err')
    setUserPoolBalance('err')
    setPoolLiquidity('err')
    setAccountStatus('error')
    console.log(err)
  })
}

async function updateUserBalance(callback?:any) {
  await fetchBalance({
    address: userAddress,
  }).then(balance => {
    userBalance = Number(balance.value) / 10**balance.decimals
    callback && callback()
  }).catch(err => {
    console.log(err)
  })
}

/**
* DOM FUNCTIONS
*/
function resetBalances(_text: string) {
  $('#userToken0Balance').data('balance', null)
  $('#userToken1Balance').data('balance', null)
  $('#userPoolBalance').data('balance', null)
  $('#userPoolBalance').data('text', null)
  $('#poolLiquidity').data('balance', null)
  $('#poolLiquidity').data('text', null)
}

$('.btnConnect').on('click', (event) => {
  event.preventDefault()
  connectAccount()
})

$('#btnSwitchNetwork').on('click', () => {
  switchNetwork({ chainId: sepolia.id })
})

$('#btnGetBalances').on('click', () => {
  if (!checkConnect()) return;
  updateBalances()
})

$('#btnDeposit0Amount50').on('click', () => {
  let userToken0Balance = parseFloat($('#userToken0Balance').data('balance'))||0
  $('#token0DepositAmount').val((userToken0Balance / 2).round(token0.decimals))
  $('#token0DepositAmount').trigger('change')
})
$('#btnDeposit0Amount100').on('click', () => {
  let userToken0Balance = parseFloat($('#userToken0Balance').data('balance'))||0
  $('#token0DepositAmount').val(userToken0Balance)
  $('#token0DepositAmount').trigger('change')
})
$('#btnDeposit1Amount50').on('click', () => {
  let userToken1Balance = parseFloat($('#userToken1Balance').data('balance'))||0
  $('#token1DepositAmount').val((userToken1Balance / 2).round(token1.decimals))
  $('#token1DepositAmount').trigger('change')
})
$('#btnDeposit1Amount100').on('click', () => {
  let userToken1Balance = parseFloat($('#userToken1Balance').data('balance'))||0
  $('#token1DepositAmount').val(userToken1Balance)
  $('#token1DepositAmount').trigger('change')
})
$('#btnPoolRemoveAmount50').on('click', () => {
  let userPoolBalance = parseFloat($('#userPoolBalance').data('balance'))||0
  $('#poolRemoveAmount').val((userPoolBalance / 2).toFixed(tokenPairDecimals))
})
$('#btnPoolRemoveAmount100').on('click', () => {
  let userPoolBalance = parseFloat($('#userPoolBalance').data('balance'))||0
  $('#poolRemoveAmount').val(userPoolBalance.toFixed(tokenPairDecimals))
})

$('#btnSwapInAmount50').on('click', () => {
  let tokenInBalance = $('#tokenIn').data('symbol') == token1.symbol ? $('#userToken1Balance').data('balance') : $('#userToken0Balance').data('balance')
  let tokenInDecimals = $('#tokenIn').data('symbol') == token1.symbol ? token1.decimals : token0.decimals
  tokenInBalance = parseFloat(tokenInBalance)||0
  $('#tokenInSwapAmount').val((tokenInBalance / 2).round(tokenInDecimals))
  $('#tokenInSwapAmount').trigger('change')
})
$('#btnSwapInAmount100').on('click', () => {
  let tokenInBalance = $('#tokenIn').data('symbol') == token1.symbol ? $('#userToken1Balance').data('balance') : $('#userToken0Balance').data('balance')
  tokenInBalance = parseFloat(tokenInBalance)||0
  $('#tokenInSwapAmount').val(tokenInBalance)
  $('#tokenInSwapAmount').trigger('change')
})

$('#btnClaimAirdrop').on('click', () => {
  if (!checkConnect() || !checkUserBalance()) return

  let myToast = toast('Please approve claim operation in your wallet.<br>Raise gas fee if network is congested.')
  $('#btnClaimAirdrop').find('.spinner').show()
  const unwatch = watchContractEvent({
    address: token0.address,
    abi: CswapTokenABI,
    eventName: 'Transfer',
  }, (log:any) => {
    removeNotifications()
    if (log[0].args.to == userAddress) {
      bootbox.alert("Operation successful! Track on <a href='https://sepolia.etherscan.io/tx/" + log[0].transactionHash + "' target='_blank'>Etherscan</a>")
    }
  })

  let removeNotifications = function() {
    unwatch()
    myToast._element && myToast.hide()
    $('#btnClaimAirdrop').find('.spinner').hide()
  }

  writeContract({
    address: token0.address,
    functionName: 'claim',
    args: [],
    abi: CswapTokenABI
  }).then(() => {
    myToast._element && myToast.hide()
  }).catch(err => {
    removeNotifications()
    if (err.cause && err.cause.code == 4001) {
      toast('Transaction rejected')
    }
    else if (err.cause && err.cause.reason == 'Already claimed') {
      bootbox.alert('Already claimed!')
    } else {
      bootbox.alert(err.shortMessage)
      console.log("btnClaimAirdrop: ", err)
    }
  })
})

$('#btnAddLiquidity').on('click', async() => {
  if (!checkConnect() || !checkUserBalance()) return

  let amountToken0 = parseFloat($('#token0DepositAmount').val() as string)||0
  let amountToken1 = parseFloat($('#token1DepositAmount').val() as string)||0

  if (!amountToken0 || !amountToken1) {
    popover($('#token0DepositAmount'), "Please enter the amounts to deposit")
    return
  }

  if (amountToken0 > parseFloat($('#userToken0Balance').data('balance'))||0) {
    popover($('#token0DepositAmount'), "You don't have enough " + token0.symbol + " to deposit!")
    return
  }
  else if (amountToken1 > parseFloat($('#userToken1Balance').data('balance'))||0) {
    popover($('#token1DepositAmount'), "You don't have enough " + token1.symbol + " to deposit!")
    return
  }

  amountToken0 = (amountToken0 * 10**token0.decimals).floor()
  amountToken1 = (amountToken1 * 10**token1.decimals).floor()

  await multicall({
    contracts: [{
      address: token0.address,
      functionName: 'allowance',
      abi: CswapTokenABI as any,
      args: [userAddress, poolManagerAddress]
    },{
      address: token1.address,
      functionName: 'allowance',
      abi: CswapTokenABI as any,
      args: [userAddress, poolManagerAddress]
    }]
  }).then(allowance => {
    let allowances = [Number(allowance[0].result), Number(allowance[1].result)]
    doAddLiquidity1(allowances, amountToken0, amountToken1)
  }).catch(err => {
    bootbox.alert(err.shortMessage)
  })
})

function doAddLiquidity1(allowances:any, amountToken0:number, amountToken1:number) {
  if (!checkConnect()) return

  if (allowances[0] >= amountToken0) {
    doAddLiquidity2(allowances, amountToken0, amountToken1)
  } else {
    let myToast = toast('Please approve allowance operation in your wallet.<br>Raise gas fee if network is congested.')
    $('#btnAddLiquidity').find('.spinner').show()
    const unwatch = watchContractEvent({
      address: token0.address,
      abi: CswapTokenABI,
      eventName: 'Approval',
    }, (log:any) => {
      removeNotifications()
      if (log[0].args.owner == userAddress && log[0].args.spender == poolManagerAddress) {
        doAddLiquidity2(allowances, amountToken0, amountToken1)
      }
    })

    let removeNotifications = function() {
      unwatch()
      myToast._element && myToast.hide()
      $('#btnAddLiquidity').find('.spinner').hide()
    }

    writeContract({
      address: token0.address,
      functionName: 'approve',
      args: [poolManagerAddress, amountToken0],
      abi: CswapTokenABI
    }).then(() => {
      myToast._element && myToast.hide()
    }).catch(err => {
      removeNotifications()
      if (err.cause && err.cause.code == 4001) {
        toast('Transaction rejected')
      } else {
        bootbox.alert(err.shortMessage)
        console.log("btnAddLiquidity: ", err)
      }
    })
  }
}

function doAddLiquidity2(allowances:any, amountToken0:number, amountToken1:number) {
  if (!checkConnect()) return

  if (allowances[1] >= amountToken1) {
    doAddLiquidity3(amountToken0, amountToken1)
  } else {
    let myToast = toast('Please approve allowance operation in your wallet.<br>Raise gas fee if network is congested.')
    $('#btnAddLiquidity').find('.spinner').show()
    const unwatch = watchContractEvent({
      address: token1.address,
      abi: CswapTokenABI,
      eventName: 'Approval',
    }, (log:any) => {
      removeNotifications()
      if (log[0].args.owner == userAddress && log[0].args.spender == poolManagerAddress) {
        doAddLiquidity3(amountToken0, amountToken1)
      }
    })

    let removeNotifications = function() {
      unwatch()
      myToast._element && myToast.hide()
      $('#btnAddLiquidity').find('.spinner').hide()
    }

    writeContract({
      address: token1.address,
      functionName: 'approve',
      args: [poolManagerAddress, amountToken1],
      abi: CswapTokenABI
    }).then(() => {
      myToast._element && myToast.hide()
    }).catch(err => {
      removeNotifications()
      if (err.cause && err.cause.code == 4001) {
        toast('Transaction rejected')
      } else {
        bootbox.alert(err.shortMessage)
        console.log("btnAddLiquidity: ", err)
      }
    })
  }
}

function doAddLiquidity3(amountToken0:number, amountToken1:number) {
  if (!checkConnect()) return

  let amountToken0Min = (amountToken0 - amountToken0 / 100).floor()
  let amountToken1Min = (amountToken1 - amountToken1 / 100).floor()

  let myToast = toast('Please approve addLiquidity operation in your wallet.<br>Raise gas fee if network is congested.')
  $('#btnAddLiquidity').find('.spinner').show()
  const unwatch = watchContractEvent({
    address: tokenPairAddress,
    abi: CswapTokenPairABI,
    eventName: 'Mint',
  }, (log:any) => {
    removeNotifications()
    if (log[0].args.to == userAddress) {
      bootbox.alert("Operation successful! Track on <a href='https://sepolia.etherscan.io/tx/" + log[0].transactionHash + "' target='_blank'>Etherscan</a>")
    } else {
      console.log(log)
    }
  })

  let removeNotifications = function() {
    unwatch()
    myToast._element && myToast.hide()
    $('#btnAddLiquidity').find('.spinner').hide()
  }

  writeContract({
    address: poolManagerAddress,
    functionName: 'addLiquidity',
    args: [amountToken0, amountToken1, amountToken0Min, amountToken1Min],
    abi: CswapPoolManagerABI
  }).then(() => {
    myToast._element && myToast.hide()
    $('#token0DepositAmount').val('')
    $('#token1DepositAmount').val('')
  }).catch(err => {
    removeNotifications()
    if (err.cause && err.cause.code == 4001) {
      toast('Transaction rejected')
    } else {
      bootbox.alert(err.shortMessage)
    }
  })
}

$('#btnRemoveLiquidity').on('click', async() => {
  if (!checkConnect()) return

  if (!tokenPairAddress) {
    bootbox.alert('Could not find the token pair address')
    return
  }

  let amountTokenPair = parseFloat($('#poolRemoveAmount').val() as string)||0

  if (!amountTokenPair) {
    popover($('#poolRemoveAmount'), "Please enter the amount to withdraw")
    return
  }

  let userPoolBalance = parseFloat($('#userPoolBalance').data('balance'))||0
  if (amountTokenPair > userPoolBalance) {
    popover($('#poolRemoveAmount'), "You don't have enough LP tokens to withdraw!")
    return
  }

  if (!checkUserBalance()) return

  amountTokenPair = (amountTokenPair * 10**tokenPairDecimals).floor()

  let allowance = await readContract({
    address: tokenPairAddress,
    functionName: 'allowance',
    abi: CswapTokenPairABI,
    args: [userAddress, poolManagerAddress]
  }) as number

  if (allowance >= parseInt(amountTokenPair.toString())) {
    doRemoveLiquidity(amountTokenPair)
  } else {
    let myToast = toast('Please approve allowance operation in your wallet.<br>Raise gas fee if network is congested.')
    $('#btnRemoveLiquidity').find('.spinner').show()
    const unwatch = watchContractEvent({
      address: tokenPairAddress,
      abi: CswapTokenPairABI,
      eventName: 'Approval',
    }, (log:any) => {
      removeNotifications()
      if (log[0].args.owner == userAddress && log[0].args.spender == poolManagerAddress) {
        doRemoveLiquidity(amountTokenPair)
      }
    })

    let removeNotifications = function() {
      unwatch()
      myToast._element && myToast.hide()
      $('#btnRemoveLiquidity').find('.spinner').hide()
    }

    writeContract({
      address: tokenPairAddress,
      functionName: 'approve',
      args: [poolManagerAddress, amountTokenPair],
      abi: CswapTokenPairABI
    }).then(() => {
      myToast._element && myToast.hide()
    }).catch(err => {
      removeNotifications()
      if (err.cause && err.cause.code == 4001) {
        toast('Transaction rejected')
      } else {
        bootbox.alert(err.shortMessage)
        console.log("btnRemoveLiquidity: ", err)
      }
    })
  }
})

function doRemoveLiquidity(amountTokenPair:number) {
  if (!checkConnect()) return

  $('#btnRemoveLiquidity').find('.spinner').show()
  let myToast = toast('Please approve removeLiquidity operation in your wallet.<br>Raise gas fee if network is congested.')
  const unwatch = watchContractEvent({
    address: tokenPairAddress,
    abi: CswapTokenPairABI,
    eventName: 'Burn',
  }, (log:any) => {
    removeNotifications()
    if (log[0].args.to == userAddress) {
      bootbox.alert("Operation successful! Track on <a href='https://sepolia.etherscan.io/tx/" + log[0].transactionHash + "' target='_blank'>Etherscan</a>")
    }
  })

  let removeNotifications = function() {
    unwatch()
    myToast._element && myToast.hide()
    $('#btnRemoveLiquidity').find('.spinner').hide()
  }

  writeContract({
    address: poolManagerAddress,
    functionName: 'removeLiquidity',
    args: [amountTokenPair],
    abi: CswapPoolManagerABI
  }).then(() => {
    myToast._element && myToast.hide()
    $('#poolRemoveAmount').val('')
  }).catch(err => {
    removeNotifications()
    if (err.cause && err.cause.code == 4001) {
      toast('Transaction rejected')
    } else {
      bootbox.alert(err.shortMessage)
      console.log("btnRemoveLiquidity: ", err)
    }
  })
}

$('#token0DepositAmount').on('change', () => {
  let amountDeposit0 = parseFloat($('#token0DepositAmount').val() as string)||0
  let amountDeposit1 = reserves[1] ? getQuote(amountDeposit0, reserves[0] / 10**token0.decimals, reserves[1] / 10**token1.decimals).round(token1.decimals) : 0
  $('#token1DepositAmount').val(amountDeposit1)
})
$('#token0DepositAmount').on('keyup', () => {
  $('#token0DepositAmount').trigger('change')
})

$('#token1DepositAmount').on('change', () => {
  let amountDeposit1 = parseFloat($('#token1DepositAmount').val() as string)||0
  let amountDeposit0 = reserves[0] ? getQuote(amountDeposit1, reserves[1] / 10**token1.decimals, reserves[0] / 10**token0.decimals).round(token0.decimals) : 0
  $('#token0DepositAmount').val(amountDeposit0)
})
$('#token1DepositAmount').on('keyup', () => {
  $('#token1DepositAmount').trigger('change')
})

function setAccountStatus(status:string) {
  $('.accountStatus').hide()
  $('.accountStatus.'+status).show()
}

function setUserToken0Balance(balance:number|string) {
  if (typeof balance == 'string') {
    $('#userToken0Balance').text(balance)
    $('#userToken0Balance').data('balance', null)
  } else {
    let balance2 = balance / 10**token0.decimals
    if (balance2 != $('#userToken0Balance').data('balance')) {
      $('#userToken0Balance').text(balance2.round(6))
      $('#userToken0Balance').data('balance', balance2)
      highlight($('#userToken0Balance'))
    }
  }
}

function setUserToken1Balance(balance:number|string) {
  if (typeof balance == 'string') {
    $('#userToken1Balance').text(balance)
    $('#userToken1Balance').data('balance', null)
  } else {
    let balance2 = balance / 10**token1.decimals
    if (balance2 != $('#userToken1Balance').data('balance')) {
      $('#userToken1Balance').text(balance2.round(6))
      $('#userToken1Balance').data('balance', balance2)
      highlight($('#userToken1Balance'))
    }
  }
}

function setUserPoolBalance(balance:number|string, assetsToken0?:any, assetsToken1?:any) {
  if (typeof balance == 'string') {
    $('#userPoolBalance').text(balance)
    $('#userPoolBalance').data('balance', null)
  } else {
    let balance2 = balance / 10**tokenPairDecimals
    let text = '<span title="'+balance2+'">'+balance2.round(6) + ' LP</span> (' + assetsToken0 + ' ' + token0.symbol + " + " + (assetsToken1 / 10**token1.decimals).round(6) + ' ' + token1.symbol + ')'
    if (text != $('#userPoolBalance').data('text')) {
      $('#userPoolBalance').html(text)
      $('#userPoolBalance').data('balance', balance2)
      $('#userPoolBalance').data('text', text)
      highlight($('#userPoolBalance'))
    }
  }
}

function setPoolLiquidity(totalSupply:number|string, reserveToken0?:any, reserveToken1?:any) {
  if (typeof totalSupply == 'string') {
    $('#poolLiquidity').text(totalSupply)
    $('#poolLiquidity').data('balance', null)
  } else {
    let balance2 = totalSupply / 10**tokenPairDecimals
    let text = '<span title="'+balance2+'">'+balance2.round(6) + ' LP</span> (' + (reserveToken0 / 10**token0.decimals).round(6) + ' ' + token0.symbol + " + " + (reserveToken1 / 10**token1.decimals).round(6) + ' ' + token1.symbol + ')'
    if (text != $('#poolLiquidity').data('text')) {
      $('#poolLiquidity').html(text)
      $('#poolLiquidity').data('balance', balance2)
      $('#poolLiquidity').data('text', text)
      highlight($('#poolLiquidity'))
    }
  }
}

/**
 * BUY AND SELL
 */
$('#btnSell').on('click', (event) => {
  event.preventDefault()

  $('#btnBuy').removeClass('active')
  $('#btnSell').addClass('active')

  $('#tokenIn').text(token0.symbol)
  $('#tokenIn').data('symbol', token0.symbol)
  $('#tokenOut').text(token1.symbol)
  $('#tokenOut').data('symbol', token1.symbol)

  if ($('#tokenInSwapAmount').val()) {
    $('#tokenInSwapAmount').val(parseFloat($('#userToken0Balance').data('balance'))||0).trigger('change')
  }
})

$('#btnBuy').on('click', (event) => {
  event.preventDefault()

  $('#btnBuy').addClass('active')
  $('#btnSell').removeClass('active')

  $('#tokenIn').text(token1.symbol)
  $('#tokenIn').data('symbol', token1.symbol)
  $('#tokenOut').text(token0.symbol)
  $('#tokenOut').data('symbol', token0.symbol)

  if ($('#tokenInSwapAmount').val()) {
    $('#tokenInSwapAmount').val(parseFloat($('#userToken1Balance').data('balance'))||0).trigger('change')
  }
})

$('#tokenInSwapAmount').on('change', () => {
  if (!checkConnect()) return

  let [tokenInDecimals, tokenOutDecimals] = $('#tokenIn').data('symbol') == token1.symbol ? [token1.decimals, token0.decimals] : [token0.decimals, token1.decimals]
  let amountIn = (parseFloat($('#tokenInSwapAmount').val() as string)||0) * 10**tokenInDecimals
  let [reserveIn, reserveOut] = $('#tokenIn').data('symbol') == token1.symbol ? [reserves[1], reserves[0]] : [reserves[0], reserves[1]]
  let amountOut = reserveIn ? getAmountOut(amountIn, reserveIn, reserveOut, feePct) : 0
  $('#tokenOutSwapAmount').val((amountOut / 10**tokenOutDecimals).round(tokenOutDecimals))
})
$('#tokenInSwapAmount').on('keyup', () => {
  $('#tokenInSwapAmount').trigger('change')
})

$('#tokenOutSwapAmount').on('change', () => {
  if (!checkConnect()) return

  let [tokenInDecimals, tokenOutDecimals] = $('#tokenIn').data('symbol') == token1.symbol ? [token1.decimals, token0.decimals] : [token0.decimals, token1.decimals]
  let amountOut = (parseFloat($('#tokenOutSwapAmount').val() as string)||0) * 10**tokenOutDecimals
  let [reserveIn, reserveOut] = $('#tokenIn').data('symbol') == token1.symbol ? [reserves[1], reserves[0]] : [reserves[0], reserves[1]]
  let amountIn = reserveOut ? getAmountIn(amountOut, reserveOut, reserveIn, feePct) : 0
  $('#tokenInSwapAmount').val((amountIn / 10**tokenInDecimals).round(tokenInDecimals))
})
$('#tokenOutSwapAmount').on('keyup', () => {
  $('#tokenOutSwapAmount').trigger('change')
})

$('#btnSwap').on('click', async() => {
  if (!checkConnect()) return

  let tokenInDecimals = $('#tokenIn').data('symbol') == token1.symbol ? token1.decimals : token0.decimals
  let tokenOutDecimals = $('#tokenOut').data('symbol') == token1.symbol ? token1.decimals : token0.decimals

  let amountTokenIn = parseFloat($('#tokenInSwapAmount').val() as string)||0
  let amountTokenOut = parseFloat($('#tokenOutSwapAmount').val() as string)||0

  if (!amountTokenIn || !amountTokenOut) {
    popover($('#tokenInSwapAmount'), "Please enter the amounts to swap!")
    return
  }

  let balanceTokenIn = $('#tokenIn').data('symbol') == token1.symbol ? $('#userToken1Balance').data('balance') : $('#userToken0Balance').data('balance')
  balanceTokenIn = parseFloat(balanceTokenIn)||0
  if (amountTokenIn > balanceTokenIn) {
    popover($('#tokenInSwapAmount'), "You don't have enough " + $('#tokenIn').data('symbol') + " to swap!")
    return
  }

  if (!checkUserBalance()) return

  amountTokenIn = (amountTokenIn * 10**tokenInDecimals).floor()
  amountTokenOut = (amountTokenOut * 10**tokenOutDecimals).floor()
  let minAmountTokenOut = (amountTokenOut - amountTokenOut / 100).floor()

  let tokenInAddress = $('#tokenIn').data('symbol') == token1.symbol ? token1.address : token0.address
  let allowance = await readContract({
    address: tokenInAddress,
    functionName: 'allowance',
    abi: CswapTokenABI,
    args: [userAddress, poolManagerAddress]
  }).catch(err => {
    bootbox.alert(err.shortMessage)
  }) as number

  if (allowance === undefined) {
    return
  }
  else if (allowance >= amountTokenIn) {
    doSwap1(tokenInAddress, amountTokenIn, amountTokenOut, minAmountTokenOut)
  } else {
    let myToast = toast('Please approve allowance operation in your wallet.<br>Raise gas fee if network is congested.')
    $('#btnSwap').find('.spinner').show()
    const unwatch = watchContractEvent({
      address: tokenInAddress,
      abi: CswapTokenABI,
      eventName: 'Approval',
    }, (log:any) => {
      removeNotifications()
      if (log[0].args.owner == userAddress && log[0].args.spender == poolManagerAddress) {
        doSwap1(tokenInAddress, amountTokenIn, amountTokenOut, minAmountTokenOut)
      }
    })

    let removeNotifications = function() {
      unwatch()
      myToast._element && myToast.hide()
      $('#btnSwap').find('.spinner').hide()
    }

    writeContract({
      address: tokenInAddress,
      functionName: 'approve',
      args: [poolManagerAddress, amountTokenIn],
      abi: CswapTokenABI
    }).then(() => {
      myToast._element && myToast.hide()
    }).catch(err => {
      removeNotifications()
      if (err.cause && err.cause.code == 4001) {
        toast('Transaction rejected')
      } else {
        bootbox.alert(err.shortMessage)
        console.log("approve: ", err)
      }
    })
  }
})

async function doSwap1(tokenInAddress:any, amountTokenIn:number, amountTokenOut:number, minAmountTokenOut:number) {
  if (!checkConnect()) return

  let prepareSwap = await prepareWriteContract({
    address: poolManagerAddress,
    functionName: 'swap',
    args: [tokenInAddress, amountTokenIn, minAmountTokenOut],
    abi: CswapPoolManagerABI
  }).catch(err => {
    console.log("prepareSwap: ", err)
  })

  if (prepareSwap === undefined) return

  let simulateAmountOut = Number(prepareSwap.result)
  let tokenOutDecimals = $('#tokenOut').data('symbol') == token1.symbol ? token1.decimals : token0.decimals

  if (simulateAmountOut.round(tokenOutDecimals-3) == amountTokenOut.round(tokenOutDecimals-3)) {
    doSwap2(prepareSwap)
  } else {
    bootbox.confirm({
      message: 'The amount to receive has changed, continue? ('+simulateAmountOut/10**tokenOutDecimals+')',
      callback: function(result) {
        if (result) {
          doSwap2(prepareSwap)
        }
      }
    })
  }
}

async function doSwap2(prepareSwap:any) {
  if (!checkConnect()) return

  let myToast = toast('Please approve swap operation in your wallet.<br>Raise gas fee if network is congested.')
  $('#btnSwap').find('.spinner').show()
  const unwatch = watchContractEvent({
    address: tokenPairAddress,
    abi: CswapTokenPairABI,
    eventName: 'Swap',
  }, (log:any) => {
    removeNotifications()
    if (log[0].args.to == userAddress) {
      bootbox.alert("Operation successful! Track on <a href='https://sepolia.etherscan.io/tx/" + log[0].transactionHash + "' target='_blank'>Etherscan</a>")
    }
  })

  let removeNotifications = function() {
    unwatch()
    myToast._element && myToast.hide()
    $('#btnSwap').find('.spinner').hide()
  }

  writeContract(prepareSwap).then(() => {
    myToast._element && myToast.hide()
    $('#tokenInSwapAmount').val('')
    $('#tokenOutSwapAmount').val('')
  }).catch(err => {
    removeNotifications()
    if (err.cause && err.cause.code == 4001) {
      toast('Transaction rejected')
    } else {
      bootbox.alert(err.shortMessage)
      console.log("swap: ", err)
    }
  })
}
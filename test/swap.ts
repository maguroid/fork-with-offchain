import { loadFixture } from '@nomicfoundation/hardhat-toolbox-viem/network-helpers'
import hre from 'hardhat'
import { parseUnits, parseEther, numberToHex, maxUint256 } from 'viem'

describe('devnet integration', function () {
  async function tenderlySetupFixture() {
    if (hre.network.name !== 'devnet')
      throw new Error('This fixture should only be used on devnet')

    const [account1] = await hre.viem.getWalletClients()
    const publicClient = await hre.viem.getPublicClient()
    const router = await hre.viem.getContractAt(
      'ISwapRouter',
      '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    )

    const pool = await hre.viem.getContractAt(
      'IUniswapV3Pool',
      '0xC6962004f452bE9203591991D15f6b388e09E8D0',
    )

    const deal = async (
      token: `0x${string}`,
      to: `0x${string}`,
      amount: bigint,
    ) => {
      return publicClient.request({
        // @ts-expect-error the method is not typed
        method: 'tenderly_setErc20Balance',
        params: [token, to, numberToHex(amount)],
      })
    }

    const movePrice = async (tickDelta: number) => {
      const weth = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
      const usdc = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'

      const wethERC20 = await hre.viem.getContractAt('IERC20', weth)
      const usdcERC20 = await hre.viem.getContractAt('IERC20', usdc)

      await wethERC20.write.approve([router.address, maxUint256])
      await usdcERC20.write.approve([router.address, maxUint256])

      let spotTick = await pool.read.slot0().then((s) => s[1])
      let wethSwapAmount = parseEther('1000')
      let usdcSwapAmount = parseUnits('1000000', 6)

      const targetTick = spotTick + tickDelta

      let swapCount = 0

      const swap = async (forToken0: boolean) => {
        console.log('swap', swapCount++, forToken0 ? 'usdc' : 'weth')
        if (forToken0)
          await deal(usdc, account1.account.address, usdcSwapAmount)
        else await deal(weth, account1.account.address, wethSwapAmount)

        return router.write.exactInputSingle([
          {
            tokenIn: forToken0 ? usdc : weth,
            tokenOut: forToken0 ? weth : usdc,
            fee: 500,
            amountIn: forToken0 ? usdcSwapAmount : wethSwapAmount,
            recipient: account1.account.address,
            amountOutMinimum: 0n,
            deadline: await publicClient
              .getBlock()
              .then((b) => b.timestamp + 60n),
            sqrtPriceLimitX96: 0n,
          },
        ])
      }

      if (spotTick < targetTick) {
        while (spotTick < targetTick) {
          await swap(true)
          spotTick = await pool.read.slot0().then((s) => s[1])
          console.log('spotTick', spotTick)
        }
      } else {
        while (spotTick > targetTick) {
          await swap(false)
          spotTick = await pool.read.slot0().then((s) => s[1])
          console.log('spotTick', spotTick)
        }
      }

      while (spotTick !== targetTick) {
        if (spotTick < targetTick) {
          await swap(true)
          spotTick = await pool.read.slot0().then((s) => s[1])
          usdcSwapAmount >>= 1n
          console.log('spotTick', spotTick)
        }

        if (spotTick > targetTick) {
          await swap(false)
          spotTick = await pool.read.slot0().then((s) => s[1])
          wethSwapAmount >>= 1n
          console.log('spotTick', spotTick)
        }
      }
    }

    return {
      account1,
      publicClient,
      pool,
      movePrice,
    }
  }

  describe('uniswap v3', function () {
    it('should swap fast', async function () {
      const { pool, movePrice } = await loadFixture(tenderlySetupFixture)

      console.log('initial tick: ', await pool.read.slot0().then((s) => s[1]))

      await movePrice(500)

      console.log('final tick: ', await pool.read.slot0().then((s) => s[1]))
    })
  })
})

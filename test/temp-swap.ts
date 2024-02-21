import hre from 'hardhat'
import { numberToHex } from 'viem'

describe('devnet integration', function () {
  it.skip('should swap', async function () {
    const [account1] = await hre.viem.getWalletClients()
    const publicClient = await hre.viem.getPublicClient()
    const router = await hre.viem.getContractAt(
      'ISwapRouter',
      '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    )

    const weth = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
    const usdc = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'

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

    await deal(usdc, account1.account.address, 10000000000n)

    await hre.viem.getContractAt('IERC20', usdc).then((usdc) => {
      return usdc.write.approve([router.address, 10000000000n])
    })

    try {
      await router.write.exactInputSingle([
        {
          tokenIn: usdc,
          tokenOut: weth,
          fee: 500,
          amountIn: 10000000000n,
          recipient: account1.account.address,
          amountOutMinimum: 0n,
          deadline: 1708513065n,
          sqrtPriceLimitX96: 0n,
        },
      ])
    } catch (e) {
      console.log('error', e)
    }
  })
})

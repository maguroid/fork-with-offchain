import hre from 'hardhat'

describe('devnet integration (ethers)', function () {
  it('should swap', async function () {
    const [account1] = await hre.ethers.getSigners()
    const router = await hre.ethers.getContractAt(
      'ISwapRouter',
      '0xE592427A0AEce92De3Edee1F18E0157C05861564',
    )

    const weth = '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1'
    const usdc = '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'

    const deal = async (token: string, to: string, amount: bigint) => {
      // for the quantity, we should not have leading zero in the hex
      // see: https://docs.ethers.org/v6/api/utils/#toQuantity
      const hex = hre.ethers.toQuantity(amount)
      return hre.ethers.provider.send('tenderly_setErc20Balance', [
        token,
        to,
        hex,
      ])
    }

    await deal(usdc, account1.address, 10000000000n)

    await hre.ethers
      .getContractAt('IERC20', usdc)
      .then((usdc) => usdc.approve(router.getAddress(), 10000000000n))

    await router.exactInputSingle.send({
      tokenIn: usdc,
      tokenOut: weth,
      fee: 500,
      amountIn: 10000000000n,
      recipient: account1.address,
      amountOutMinimum: 0n,
      deadline: Math.floor(Date.now() / 1000) + 60,
      sqrtPriceLimitX96: 0n,
    })
  })
})

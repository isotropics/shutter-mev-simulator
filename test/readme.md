To run these tests:

1. Save this as `test/MEVSimulator.test.js`

2. Make sure `.env` file has:
```env
GNOSIS_RPC_URL=your_rpc_url
PRIVATE_KEY=your_private_key_without_0x
UNISWAP_ROUTER=0x1C232F01118CB8B424793ae03F870aa7D0ac7f77
XDI_TOKEN_ADDRESS=your_xdi_token_address
GAS_LIMIT=2000000
GAS_PRICE=5

TEST_AMOUNT="1"// Amount in XDI
VICTIM_AMOUNT="100"// Victim trade size
SLIPPAGE="5"

3. Run tests:
```bash
npx hardhat test
```

Features of these tests:
1. Tests all main functionalities
2. Handles non-existent pools gracefully
3. Tests error conditions
4. Provides detailed logging
5. Verifies events
6. Tests MEV simulation
7. Checks price impact

The tests will skip (rather than fail) conditions that depend on pool existence or liquidity, making it useful even in development environments.​​​​​​​​​​​​​​​​
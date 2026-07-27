import { ethers } from 'ethers';
import axios from 'axios';

const API_KEY = 'pim_Sqj8PJ8s1AjbsPrgXyCx7U';
const URL = `https://api.pimlico.io/v2/base-sepolia/rpc?apikey=${API_KEY}`;
const ENTRYPOINT_V07 = '0x0000000071727De22E5E9d8BAf0edAc6f37da032';
const FACTORY = '0x91E60e0613810449d098b0b5Ec8b51A0FE8c8985';

async function rpcCall(method: string, params: any[]) {
    const response = await axios.post(URL, { jsonrpc: '2.0', method, params, id: 1 });
    if (response.data.error) {
        console.error('ERROR:', JSON.stringify(response.data.error, null, 2));
    } else {
        console.log('RESULT:', JSON.stringify(response.data.result, null, 2));
    }
    return response.data;
}

async function main() {
    // Test 1: Minimal userOp with factory/factoryData (counterfactual)
    console.log('\n=== Test 1: Minimal counterfactual userOp ===');
    const initCode = FACTORY.toLowerCase() + ethers.AbiCoder.defaultAbiCoder()
        .encode(['address', 'uint256'], ['0xaac5d4240af87249b3f71bc8e4a2cae074a3e419', 0])
        .slice(2);

    const dummySig = '0x00000000000000000000000000000000000000000000000000000000000000017fffffffffffffffffffffffffffffff5d576e7357a4501ddfe92f46681b20a01b';

    const userOp1 = {
        sender: '0x435c4d04767801155A1E1F6a23343A3a135037ed',
        nonce: '0x0',
        factory: ethers.getAddress('0x' + initCode.slice(2).slice(0, 40)),
        factoryData: '0x' + initCode.slice(2).slice(40),
        callData: '0x',
        callGasLimit: '0x0',
        verificationGasLimit: '0x0',
        preVerificationGas: '0x0',
        maxFeePerGas: '0x3b9aca00',
        maxPriorityFeePerGas: '0x3b9aca00',
        paymaster: null,
        paymasterVerificationGasLimit: null,
        paymasterPostOpGasLimit: null,
        paymasterData: null,
        signature: dummySig,
    };

    await rpcCall('pm_sponsorUserOperation', [userOp1, ENTRYPOINT_V07]);

    // Test 2: With sponsorshipPolicyId
    console.log('\n=== Test 2: With sponsorshipPolicyId ===');
    await rpcCall('pm_sponsorUserOperation', [userOp1, ENTRYPOINT_V07, {}]);

    // Test 3: Try v0.6 format (initCode instead of factory/factoryData)
    console.log('\n=== Test 3: v0.6 format ===');
    const userOpV06 = {
        sender: '0x435c4d04767801155A1E1F6a23343A3a135037ed',
        nonce: '0x0',
        initCode: initCode,
        callData: '0x',
        callGasLimit: '0x0',
        verificationGasLimit: '0x0',
        preVerificationGas: '0x0',
        maxFeePerGas: '0x3b9aca00',
        maxPriorityFeePerGas: '0x3b9aca00',
        paymasterAndData: '0x',
        signature: dummySig,
    };
    const ENTRYPOINT_V06 = '0x5FF137D4b0FDCD49DcA30c7CF57E578a026d2789';
    await rpcCall('pm_sponsorUserOperation', [userOpV06, ENTRYPOINT_V06]);
}

main().catch(console.error);

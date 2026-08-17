import { ethers } from 'hardhat';

async function main() {
    const functions = [
        'paySubscription(address,address,uint256,bytes32,address,uint256)',
        'payTip(address,address,uint256,address,uint256)',
        'payPPV(address,address,uint256,bytes32,address,uint256)',
        'approveRecurringSubscription(address,uint256,uint256)',
        'revokeRecurringSubscription(address)',
        'processRenewal(bytes32,address,address,address,uint256,address,uint256)',
        'processPayout(address,address,uint256)'
    ];

    functions.forEach(f => {
        const selector = ethers.id(f).substring(0, 10);
        console.log(`${f} => ${selector}`);
    });
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

const { compile } = require('./compile.js');
const { deploy } = require('./deploy.js');
const web3 = require('./../web3.js');

class Contracts {
    constructor() {
        this.contracts = {};
    }

    async add(contract) {
        const sc = compile(contract.filename, contract.name);
        const address = await deploy(sc, contract.args);

        console.log(`${contract.name} deployed at address ${address}`);

        this.contracts[contract.name] = contract;
        this.contracts[contract.name].address = address;
        this.contracts[contract.name].args = contract.args;
        this.contracts[contract.name].abi = sc.abi;
        this.contracts[contract.name].contract = new web3.eth.Contract(sc.abi, address);
    }

    ensureContract(name) {
        if (!this.contracts.hasOwnProperty(name)) {
            console.log(`contract ${name} not found`);
            return false;
        }

        return true;
    }

    getAbi(name) {
        if (!this.ensureContract(name)) return;

        return this.contracts[name]["abi"];
    }

    getAddress(name) {
        if (!this.ensureContract(name)) return;

        return this.contracts[name]["address"];
    }

    getContractByName(name) {
        if (!this.ensureContract(name)) return;

        return this.contracts[name]["contract"];
    }

    getContractByFunction(healthFunction) {
        for (const contractName in this.contracts) {
            const sc = this.contracts[contractName];

            if (sc.purpose &&
                sc.purpose.localeCompare(healthFunction, undefined, { sensitivity: 'base' }) === 0) {

                return sc;
            }
        }
    }
}

let contracts = new Contracts;

module.exports = { contracts }
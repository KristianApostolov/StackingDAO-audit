import { Simnet } from "@hirosystems/clarinet-sdk";
import { ClarityValue, contractPrincipalCV } from "@stacks/transactions";

import { BaseContract } from "./interfaces";

export default class Base implements BaseContract {
    chain: Simnet;
    name: string;
    deployer: string;
    principal: string;
    principalCV: ClarityValue;

    constructor(chain: Simnet, deployer: string, name: string) {
        this.chain = chain;
        this.name = name;
        this.deployer = deployer;
        this.principal = `${deployer}.${name}`;
        this.principalCV = contractPrincipalCV(deployer, name);
    }
}
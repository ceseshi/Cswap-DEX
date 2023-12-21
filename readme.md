# Cswap DEX

This is my personal project for CodingHeroes / ThemarAcademy Solidity bootcamp.

I wanted to build a dapp that would help me to understand how Uniswap V2 works, being one of the most known blockchain solutions, and how the communication between the dapp and the smart contracts works, passing through the user wallet and the RPC calls, controlling transaction amounts, API parameters and the events returned by the contracts. All this using the latest possible versions of each language and library.

It is not intended to be a real dapp, but a testing playground.

> Este es mi proyecto personal para el bootcamp de Solidity de CodingHeroes / ThemarAcademy.
> Quise realizar una dapp que me ayudase a entender el funcionamiento de Uniswap V2, por ser una de las soluciones blockchain más conocidas, y cómo cómo funciona la comunicación entre la dapp y los smart contracts, pasando por la wallet del usuario y las llamadas al RPC, controlando los importes de las transacciones, los parámetros de la API y los eventos que devuelven los contratos. Todo ello usando las últimas versiones posibles de cada lenguaje y librería.
> No pretende ser una aplicación real, sino un campo de pruebas.

# Demo site:

<a href="https://cswapdex.vercel.app/" target="_blank">https://cswapdex.vercel.app</a>

It is built on Sepolia, so you will need Sepolia ETH to test it. If you don't have it, the dapp will tell you where to get it.
> Está construida sobre Sepolia, por lo que necesitarás Sepolia ETH para probarla. Si no lo tienes, la aplicación te dirá dónde conseguirlo.

## Interface

For the interface I wanted to implement the latest version of <a href="https://web3modal.com/" target="_blank">Web3modal</a>, because of the new support for <a href="https://eips.ethereum.org/EIPS/eip-6963" target="_blank">EIP-6963</a>. Also, I wanted to try <a href="https://viem.sh/docs/introduction.html" target="_blank">Viem</a> for its advantages over Ethers, such as <a href="https://viem.sh/docs/typescript.html" target="_blank">strong typing</a>, and having a low-level API with lower abstraction, which allows to see better what is going on behind.

Seeing that Web3modal could be implemented with Wagmi/Core, and Wagmi uses Viem, this was a good combo. In the end I used the Wagmi/Core javascript API, which wraps and extends the Viem methods.

I implemented the interface in Vanilla JS and Bootstrap CSS, as they have always allowed me to quickly layout and easily debug everything that happens in the browser, although the next project could be in Next.js and Tailwind CSS.

I have not used any frontend framework, all transactions and inputs and events control have been developed from scratch following the documentation of each library.

As bundler I chose Vite, for being easy to implement and having native support for Typescript and ES modules.

> Para la interfaz me apetecía implementar la última versión de Web3modal, por el nuevo soporte para EIP-6963. Además, quería probar Viem por sus ventajas sobre Ethers, como el tipado fuerte, y el tener una API de bajo nivel con menor abstracción, que permite ver mejor lo que está pasando.
> Viendo que Web3modal podía implementarse con Wagmi/Core, y que Wagmi usa Viem, este era el combo perfecto. Al final utilicé la API javascript de Wagmi/Core, que envuelve y extiende los métodos de Viem.
> Implementé la interfaz en Vanilla JS y Bootstrap CSS, ya que siempre me han permitido maquetar rápido y depurar fácilmente todo lo que ocurre en el navegador, aunque el próximo proyecto podría ser en Next.js y Tailwind CSS.
> No he utilizado ningún framework de frontend, toda la lógica de transacciones y el control de inputs y eventos han sido desarrollados desde cero siguiendo la documentación de cada librería.
> Como empaquetador elegí Vite, por ser fácil de implementar y tener soporte nativo para Typescript y ES modules.

# Smart contracts

The dapp consists of 3 smart contracts in the style of Uniswap V2, but adapted to the latest versions of Solidity and OpenZeppelin:

- CswapToken: Provides the CSWP token. It is based on the ERC20 standard, with the particularity that it allows users to claim an airdrop of 1000 tokens, with a limit of 1000 users. This is controlled by setting a maximum total claimable amount equal to twice the initial supply, and sending each user that maximum divided by 1000, so that when the claimable amount is exhausted, the airdrop is over. The same wallet can only claim once.

- CswapTokenPair: Allows to create a liquidity pool between two tokens, so that token A can be exchanged for token B and vice versa. The contract calculates the price of each token based on the amount of each deposited in the pool. In addition, any user can deposit and withdraw liquidity from the pool, benefiting from the commissions it generates. The contract is deployed with an initial amount of CSWP and WETH, which allows users to exchange their CSWP tokens for WETH.

- CswapPoolManager: It is in charge of creating the token pair and controlling it, equivalent to the Uniswap Router. It allows users to interact with the pool, controlling the movement of funds when depositing, withdrawing or exchanging tokens.

> La dapp consta de 3 smart contracts al estilo de Uniswap V2, pero adaptados a las últimas versiones de Solidity y OpenZeppelin:
> - CswapToken: Proporciona el token CSWP. Está basado en el estándar ERC20, con la particularidad de que permite a los usuarios claimear un airdrop de 1000 tokens, con un límite de 1000 usuarios. Esto se controla estableciendo una cantidad máxima total claimeable igual al doble del supply inicial, y enviando a cada usuario ese máximo dividido por 1000, de forma que cuando se agote la cantidad claimeable se habrá terminado el airdrop. Una misma wallet sólo puede claimear una vez.
> - CswapTokenPair: Permite crear un pool de liquidez entre dos tokens, de forma que se puede intercambiar el token A por el token B y viceversa. El contrato calcula el precio de cada token en función de la cantidad de cada uno depositada en el pool. Además, cualquier usuario puede depositar y retirar liquidez del pool, beneficiándose de las comisiones que genera. El contrato se deploya con una cantidad inicial de CSWP y WETH, que permite a los usuarios intercambiar sus tokens CSWP por WETH.
> - CswapPoolManager: Se encarga de crear el par de tokens y controlarlo, equivalente al Uniswap Router. Facilita a los usuarios interactuar con el pool, controlando el movimiento de fondos al depositar, retirar o intercambiar tokens.

## Features
- Connect wallet:
	- Thanks to the Web3modal component, the user can connect any EVM-compatible web3 wallet, such as Metamask, Rabby or Brave, or mobile wallets via WalletConnect.

- Claim:
	- The contract offers the first 1000 users an airdrop of their CSWP token. Each wallet can make claim only once.

- Swap:
	- Users can swap their CSWP tokens for WETH and vice versa, with the price set by the liquidity pool at any given time.

- Add liquidity:
	- The user can deposit his CSWP and WETH tokens into the liquidity pool, receiving in exchange a number of LP tokens proportional to the amount deposited. LP tokens represent the user's participation in the pool, and allow him to withdraw his share from the pool at any time.

- Remove liquidity:
	- The user can withdraw his CSWP and WETH tokens from the pool, in addition to the generated commissions, returning in return a number of LP tokens proportional to the amount withdrawn.

The dapp controls at all times the amounts that the user enters, to prevent him from trying to deposit more than he has or withdraw more than he has deposited. In addition, the contract controls that the pool has sufficient liquidity to perform the exchanges, and that the swap price does not deviate more than 1% from the market price.

> - Connect wallet:
	- Gracias al componente Web3modal, el usuario puede conectar cualquier wallet web3 compatible con EVM, como Metamask, Rabby o Brave, o wallets móviles a través de WalletConnect.
> - Claim:
	- El contrato ofrece a los primeros 1000 usuarios un airdrop de su token CSWP. Cada wallet puede hacer claim una sola vez.
> - Swap:
	- El usuario puede intercambiar sus tokens CSWP por WETH y viceversa, con el precio establecido por el pool de liquidez en cada momento.
> - Add liquidity:
	- El usuario puede depositar sus tokens CSWP y WETH en el pool de liquidez, recibiendo a cambio un número de tokens LP proporcional a la cantidad depositada. Los tokens LP representan la participación del usuario en el pool, y le permiten retirar su parte del pool en cualquier momento.
> - Remove liquidity:
	- El usuario puede retirar sus tokens CSWP y WETH del pool, además de las comisiones generadas, devolviendo a cambio un número de tokens LP proporcional a la cantidad retirada.
> La dapp controla en todo momento los importes que el usuario introduce, para evitar que intente depositar más de lo que tiene o retirar más de lo depositado. Además, el contrato controla que el pool tenga suficiente liquidez para realizar los intercambios, y que el precio de swap no se desvíe más de un 1% del precio de mercado.

## How to use it
1. Claim: Connect your wallet and claim the CSWP airdrop. You will need some ETH in Sepolia for the gas. If you don't have it, the dapp will tell you where to get it.

2. Swap: Exchange half of your CSWP for ETH.

3. Deposit: Deposit 100% of your tokens to the liquidity pool. If you don't have enough of one of the tokens, mark 100% of that token. As long as they are deposited, your liquidity will generate fees every time someone makes a swap in the pool.

4. Remove: When you want to recover your deposit, withdraw all or part of it, plus the generated fees.

> 1. Claim: Conecta tu wallet y claimea el airdrop de CSWP. Necesitarás un poco de ETH en Sepolia para el gas. Si no lo tienes, la dapp te indicará dónde conseguirlo.
> 2. Swap: Intercambia la mitad de tus CSWP por ETH.
> 3. Deposit: Deposita el 100% de tus tokens a la liquidez del pool. Si no tienes suficiente cantidad de uno de los tokens, marca el el 100% de ese token. Mientras estén depositados, tu liquidez generará fees cada vez que alguien realice un swap en el pool.
> 4. Remove: Cuando quieras recuperar tu depósito, retira todo o una parte, más las fees generadas.

## Prerequisites
- <a href="https://nodejs.org/en/download/package-manager" target="_blank">Node</a>
- <a href="https://yarnpkg.com/getting-started/install" target="_blank">Yarn</a>
- <a href="https://book.getfoundry.sh/getting-started/installation" target="_blank">Foundry</a>

## Setup and Configuration
- Contracts:
	1. Clone the repository:
	```shell
	git clone https://github.com/ceseshi/Cswap-DEX.git
	cd Cswap-DEX
	```
	2. Create a Sepolia project in <a href="https://www.alchemy.com/" target="_blank">Alchemy</a>
	3. Set the Alchemy RPC url in .env file
	```shell
	```shell
	SEPOLIA_RPC_URL=
	```
	3. Write the RPC url to .env file
	4. Run a local fork:
	```shell
	anvil -f [SEPOLIA_RPC_URL] --chain-id 11155111
	```
	4. Deploy contracts. It will use the test private key from .env (PRIVATE_KEY_DEVEL):
	```shell
	make deploy-local
	```
- Interface:
	1. Install dependencies:
	```shell
	cd www
	yarn install
	```
	2. Create a <a href="https://cloud.walletconnect.com/" target="_blank">WalletConnect</a> project, get the Project ID
	3. Create .env file, set VITE_WC3_PROJECT_ID
	```shell
	cp .env.example .env
	```
	4. Run local environment, browse to http://localhost:5173/
	```shell
	yarn dev
	```

## Deploy to production
- Set your private key in .env file
	```shell
	PRIVATE_KEY_PROD=
	```
- Deploy contracts:
	```shell
	make deploy-production
	```
- Deploy interface:
	- A. To your own FTP:
		- Add your ftp credentials to .env file
		- Run build:
		```shell
		cd www
		yarn build
		```
	- B. To Vercel:
		- Sign up and create your project in <a href="https://vercel.com/" target="_blank">Vercel</a>
		- Install <a href="https://vercel.com/docs/cli" target="_blank">cli</a>:
		```shell
		yarn add vercel
		```
		- Run deploy and follow instructions:
		```shell
		cd www
		vercel deploy --prod
		```

## Contracts testing
(work in progress...)
```shell
forge test
```

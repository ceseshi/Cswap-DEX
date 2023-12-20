#include .env

simulate:
	forge script script/CswapDeploy.s.sol:CswapDeploy --rpc-url local -s "runLocal()"
	forge inspect CswapPoolManager abi > ./www/abi/CswapPoolManager.json
	forge inspect CswapTokenPair abi > ./www/abi/CswapTokenPair.json
	forge inspect CswapToken abi > ./www/abi/CswapToken.json

deploy-local:
	forge script script/CswapDeploy.s.sol:CswapDeploy --rpc-url local -s "runLocal()" --broadcast
	forge inspect CswapPoolManager abi > ./www/abi/CswapPoolManager.json
	forge inspect CswapTokenPair abi > ./www/abi/CswapTokenPair.json
	forge inspect CswapToken abi > ./www/abi/CswapToken.json
	cp ./tmp/vite.env ./www/.env.local

deploy-production:
	forge script script/CswapDeploy.s.sol:CswapDeploy --rpc-url sepolia -s "runProduction()" --broadcast
	forge inspect CswapPoolManager abi > ./www/abi/CswapPoolManager.json
	forge inspect CswapTokenPair abi > ./www/abi/CswapTokenPair.json
	forge inspect CswapToken abi > ./www/abi/CswapToken.json
	cp ./tmp/vite.env ./www/.env.production
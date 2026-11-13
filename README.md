# ShopRally (SalesMax)

Sales CRM for FASTSIGNS of Northern Kentucky. Code only: customer data and keys stay in AWS.

## How changes go live
- `test` branch: every change saved here updates the **test copy** automatically (AWS CodeBuild runs all checks first; a failed check means nothing deploys).
- `main` branch: the approved version. Changes reach it only through a pull request that Phil approves.
- Keys and customer data never go in this repository. A build check blocks anything that looks like a key.

# Deploying AgriTech Platform on Coolify

Coolify is a self-hosted PaaS that deploys applications from Git repositories using Docker. This guide covers deploying the AgriTech Platform monorepo as a Docker Compose stack on Coolify.

## Architecture

This is a single-page application (SPA). The frontend is a static React bundle served by nginx — all routing happens client-side via React Router. The backend is a standalone FastAPI REST API that the SPA calls over HTTPS. There is no server-side rendering.

```
Browser (SPA)  ──HTTPS──▶  nginx (static files)
    │
    └──── API calls ──▶  FastAPI (Gunicorn + Uvicorn)
                              │
                    ┌─────────┼──────────┐
                    ▼         ▼          ▼
               Cognito    RDS/PG       S3
```

| Service    | Image         | Port | Description                          |
| ---------- | ------------- | ---- | ------------------------------------ |
| `frontend` | nginx:1.27    | 80   | Serves the built React SPA           |
| `backend`  | python:3.12   | 8000 | FastAPI served via Gunicorn + Uvicorn |

## Prerequisites

- A Coolify instance (v4+) with a connected server
- A Git repository (GitHub, GitLab, or Gitea) containing this project
- An AWS account with access to Cognito, RDS, and S3
- (Optional) AWS CLI installed and configured locally

---

## Part 1: AWS Service Setup

Complete these steps before deploying to Coolify. Each step includes both AWS Console (GUI) and CLI instructions. All resources target `ap-southeast-1` (Singapore).

### 1.1 Create a Cognito User Pool

Cognito handles all authentication: password login, OAuth, passwordless, and MFA.

#### Console (GUI)

1. Open the [Amazon Cognito console](https://console.aws.amazon.com/cognito/v2/idp/user-pools) and ensure the region is set to **Asia Pacific (Singapore) ap-southeast-1**
2. Click **Create user pool**
3. Under **Application type**, select **Traditional web application**
4. Name the application `agritech-web-client`
5. Under **Options for sign-in identifiers**, select **Email**
6. Under **Required attributes for sign-up**, keep **email** selected
7. For **Return URL**, enter `https://agritech.example.com/login` (your frontend domain — you can change this later)
8. Click **Create**
9. From the **User pool overview** page, note the **User pool ID** (e.g., `ap-southeast-1_AbCdEfGhI`) — this is your `COGNITO_USER_POOL_ID`
10. Go to **App clients** in the left sidebar, click your app client, and note the **Client ID** — this is your `COGNITO_CLIENT_ID`

Now enable MFA:

11. Go to **Sign-in** → **Multi-factor authentication**
12. Set MFA enforcement to **Optional**
13. Under MFA methods, enable **Authenticator apps (TOTP)**
14. Click **Save changes**

Configure password policy:

15. Go to **Sign-in** → **Password policy**
16. Set minimum length to **8**, require uppercase, lowercase, and numbers
17. Click **Save changes**

#### CLI

```bash
aws cognito-idp create-user-pool \
  --pool-name agritech-user-pool \
  --auto-verified-attributes email \
  --username-attributes email \
  --mfa-configuration OPTIONAL \
  --software-token-mfa-configuration Enabled=true \
  --password-policy MinimumLength=8,RequireUppercase=true,RequireLowercase=true,RequireNumbers=true,RequireSymbols=false \
  --account-recovery-setting "RecoveryMechanisms=[{Priority=1,Name=verified_email}]" \
  --schema '[{"Name":"email","Required":true,"Mutable":true}]' \
  --region ap-southeast-1
```

Note the `UserPool.Id` from the output — this is your `COGNITO_USER_POOL_ID`.

```bash
aws cognito-idp create-user-pool-client \
  --user-pool-id <POOL_ID> \
  --client-name agritech-web-client \
  --explicit-auth-flows ALLOW_USER_PASSWORD_AUTH ALLOW_REFRESH_TOKEN_AUTH ALLOW_USER_SRP_AUTH \
  --supported-identity-providers COGNITO \
  --prevent-user-existence-errors ENABLED \
  --region ap-southeast-1
```

Note the `UserPoolClient.ClientId` — this is your `COGNITO_CLIENT_ID`.


### 1.2 (Optional) Add Google OAuth Provider

#### Console (GUI)

1. First, create OAuth credentials at [Google Cloud Console](https://console.cloud.google.com/apis/credentials):
   - Create a new OAuth 2.0 Client ID (Web application type)
   - Add authorized redirect URI: `https://<your-cognito-domain>.auth.ap-southeast-1.amazoncognito.com/oauth2/idpresponse`
   - Note the **Client ID** and **Client Secret**

2. In the Cognito console, go to your user pool → **Sign-in** → **Federated identity providers**
3. Click **Add identity provider** → select **Google**
4. Enter the Google Client ID and Client Secret
5. For **Authorized scopes**, enter: `openid email profile`
6. Map attributes: Google `email` → Cognito `email`, Google `name` → Cognito `name`
7. Click **Add identity provider**

8. Go to **App clients** → select your client → **Edit hosted UI**
9. Under **Identity providers**, add **Google** alongside **Cognito**
10. Set **Callback URL** to `https://agritech.example.com/login`
11. Set **Sign-out URL** to `https://agritech.example.com`
12. Under **OAuth 2.0 grant types**, select **Authorization code grant**
13. Under **OpenID Connect scopes**, select `openid`, `email`, `profile`
14. Click **Save changes**

#### CLI

```bash
aws cognito-idp create-identity-provider \
  --user-pool-id <POOL_ID> \
  --provider-name Google \
  --provider-type Google \
  --provider-details '{"client_id":"<GOOGLE_CLIENT_ID>","client_secret":"<GOOGLE_CLIENT_SECRET>","authorize_scopes":"openid email profile"}' \
  --attribute-mapping '{"email":"email","name":"name"}' \
  --region ap-southeast-1

aws cognito-idp update-user-pool-client \
  --user-pool-id <POOL_ID> \
  --client-id <CLIENT_ID> \
  --supported-identity-providers COGNITO Google \
  --callback-urls '["https://agritech.example.com/login"]' \
  --logout-urls '["https://agritech.example.com"]' \
  --allowed-o-auth-flows code \
  --allowed-o-auth-scopes openid email profile \
  --allowed-o-auth-flows-user-pool-client \
  --region ap-southeast-1
```

### 1.3 Create an RDS PostgreSQL Instance

#### Console (GUI)

1. Open the [Amazon RDS console](https://console.aws.amazon.com/rds/) in **ap-southeast-1**
2. Click **Create database**
3. Choose **Standard create**
4. Configuration:
   - **Engine**: PostgreSQL
   - **Engine version**: PostgreSQL 16.4
   - **Templates**: Free tier (for dev) or Production
   - **DB instance identifier**: `agritech-db`
   - **Master username**: `agritech_admin`
   - **Master password**: choose a strong password and save it securely
5. Instance configuration:
   - **DB instance class**: `db.t4g.micro` (Free tier eligible) or `db.t4g.small` for production
6. Storage:
   - **Storage type**: gp3
   - **Allocated storage**: 20 GiB
7. Connectivity:
   - **VPC**: select your VPC (or use the default)
   - **Public access**: Yes (for initial setup — change to No for production)
   - **VPC security group**: Create new, name it `agritech-db-sg`
   - Add an inbound rule for PostgreSQL (port 5432) from your Coolify server's IP
8. Additional configuration:
   - **Initial database name**: `agritech`
   - **Backup retention**: 7 days
   - **Enable deletion protection**: Yes (for production)
9. Click **Create database**
10. Wait for the status to show **Available** (takes 5-10 minutes)
11. Click the DB instance → note the **Endpoint** under Connectivity & security

Your `DATABASE_URL` is: `postgresql://agritech_admin:<PASSWORD>@<ENDPOINT>:5432/agritech`

#### CLI

```bash
aws rds create-db-subnet-group \
  --db-subnet-group-name agritech-db-subnet \
  --db-subnet-group-description "AgriTech DB subnets" \
  --subnet-ids <SUBNET_1> <SUBNET_2> \
  --region ap-southeast-1

aws rds create-db-instance \
  --db-instance-identifier agritech-db \
  --db-instance-class db.t4g.micro \
  --engine postgres \
  --engine-version 16.4 \
  --master-username agritech_admin \
  --master-user-password '<STRONG_PASSWORD>' \
  --allocated-storage 20 \
  --storage-type gp3 \
  --db-name agritech \
  --db-subnet-group-name agritech-db-subnet \
  --publicly-accessible \
  --backup-retention-period 7 \
  --region ap-southeast-1

aws rds wait db-instance-available \
  --db-instance-identifier agritech-db \
  --region ap-southeast-1

aws rds describe-db-instances \
  --db-instance-identifier agritech-db \
  --query 'DBInstances[0].Endpoint.Address' \
  --output text \
  --region ap-southeast-1
```

**Security note:** For production, set `--no-publicly-accessible` and connect via VPC peering or a bastion host.

### 1.4 Create an S3 Bucket for Simulation Media

#### Console (GUI)

1. Open the [Amazon S3 console](https://console.aws.amazon.com/s3/)
2. Click **Create bucket**
3. Configuration:
   - **Bucket name**: `agritech-simulations` (must be globally unique — append your account ID if needed)
   - **AWS Region**: Asia Pacific (Singapore) ap-southeast-1
4. **Block Public Access settings**: keep all four options checked (all public access blocked). Simulation media is served via presigned URLs, so public access is not needed.
5. **Bucket Versioning**: Enable
6. Leave other settings as defaults
7. Click **Create bucket**

#### CLI

```bash
aws s3api create-bucket \
  --bucket agritech-simulations \
  --region ap-southeast-1 \
  --create-bucket-configuration LocationConstraint=ap-southeast-1

aws s3api put-public-access-block \
  --bucket agritech-simulations \
  --public-access-block-configuration \
    BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true

aws s3api put-bucket-versioning \
  --bucket agritech-simulations \
  --versioning-configuration Status=Enabled
```

### 1.5 Create an IAM User for the Backend

The backend needs programmatic access to Cognito (admin APIs for MFA lockout) and S3 (presigned URLs for simulation media).

#### Console (GUI)

1. Open the [IAM console](https://console.aws.amazon.com/iam/) → **Users** → **Create user**
2. **User name**: `agritech-backend`
3. Do not enable console access (this is a service account)
4. Click **Next** → **Attach policies directly**
5. Click **Create policy** (opens a new tab):
   - Switch to the **JSON** editor and paste:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "cognito-idp:AdminDisableUser",
           "cognito-idp:AdminEnableUser",
           "cognito-idp:AdminGetUser"
         ],
         "Resource": "arn:aws:cognito-idp:ap-southeast-1:<ACCOUNT_ID>:userpool/<POOL_ID>"
       },
       {
         "Effect": "Allow",
         "Action": [
           "s3:GetObject",
           "s3:PutObject",
           "s3:ListBucket"
         ],
         "Resource": [
           "arn:aws:s3:::agritech-simulations",
           "arn:aws:s3:::agritech-simulations/*"
         ]
       }
     ]
   }
   ```
   - Replace `<ACCOUNT_ID>` with your AWS account ID and `<POOL_ID>` with your Cognito User Pool ID
   - Name the policy `agritech-backend-policy`
   - Click **Create policy**
6. Back in the user creation tab, refresh the policy list and attach `agritech-backend-policy`
7. Click **Create user**
8. Select the user → **Security credentials** → **Create access key**
9. Select **Application running outside AWS** as the use case
10. Note the **Access key ID** and **Secret access key** — you'll need these for Coolify

#### CLI

```bash
aws iam create-user --user-name agritech-backend

aws iam put-user-policy \
  --user-name agritech-backend \
  --policy-name agritech-backend-policy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "cognito-idp:AdminDisableUser",
          "cognito-idp:AdminEnableUser",
          "cognito-idp:AdminGetUser"
        ],
        "Resource": "arn:aws:cognito-idp:ap-southeast-1:<ACCOUNT_ID>:userpool/<POOL_ID>"
      },
      {
        "Effect": "Allow",
        "Action": [
          "s3:GetObject",
          "s3:PutObject",
          "s3:ListBucket"
        ],
        "Resource": [
          "arn:aws:s3:::agritech-simulations",
          "arn:aws:s3:::agritech-simulations/*"
        ]
      }
    ]
  }'

aws iam create-access-key --user-name agritech-backend
```

### 1.6 Summary of Values to Collect

After completing Part 1, you should have:

| Value                    | Source                  | Example                                        |
| ------------------------ | ----------------------- | ---------------------------------------------- |
| `COGNITO_USER_POOL_ID`   | Cognito → User pool ID | `ap-southeast-1_AbCdEfGhI`                    |
| `COGNITO_CLIENT_ID`      | Cognito → App client   | `1abc2def3ghi4jkl5mno6pqr`                    |
| `DATABASE_URL`           | RDS → Endpoint         | `postgresql://agritech_admin:pw@host:5432/agritech` |
| `AWS_ACCESS_KEY_ID`      | IAM → Access key       | `AKIAIOSFODNN7EXAMPLE`                         |
| `AWS_SECRET_ACCESS_KEY`  | IAM → Secret key       | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`   |

---

## Part 2: Coolify Deployment

### 2.1 Create a PostgreSQL Database (Alternative to RDS)

If you prefer Coolify's built-in PostgreSQL instead of RDS:

1. Go to your project → click **New** → **Database**
2. Select **PostgreSQL**
3. Note the connection URL — use it as `DATABASE_URL`

Skip this if you set up RDS in Part 1.

### 2.2 Create a Docker Compose Resource

1. Go to your project → click **New** → **Docker Compose**
2. Select your Git source and repository
3. Set the branch (e.g., `main`)
4. Coolify will detect the `docker-compose.yml` at the root

### 2.3 Configure Environment Variables

In the Coolify resource settings, add these environment variables:

**Required:**

| Variable                | Example                                          |
| ----------------------- | ------------------------------------------------ |
| `SECRET_KEY`            | `a-long-random-string-at-least-32-chars`         |
| `DATABASE_URL`          | `postgresql://user:pass@db-host:5432/agritech`   |
| `COGNITO_USER_POOL_ID`  | `ap-southeast-1_AbCdEfGhI`                      |
| `COGNITO_CLIENT_ID`     | `1abc2def3ghi4jkl5mno6pqr`                      |
| `AWS_ACCESS_KEY_ID`     | `AKIAIOSFODNN7EXAMPLE`                           |
| `AWS_SECRET_ACCESS_KEY` | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY`     |

**Optional:**

| Variable       | Default                    | Description                    |
| -------------- | -------------------------- | ------------------------------ |
| `AWS_REGION`   | `ap-southeast-1`           | AWS region for Cognito/S3      |
| `FRONTEND_URL` | `http://localhost:5173`    | Allowed CORS origin            |
| `DEBUG`        | `false`                    | Enables /docs and /redoc       |
| `VITE_API_URL` | `http://localhost:8000`    | Backend URL baked into frontend|

**Important:** `VITE_API_URL` is a build-time variable — it gets baked into the frontend bundle during the Docker build. Set `FRONTEND_URL` to your actual frontend domain (e.g., `https://agritech.example.com`) and `VITE_API_URL` to your backend domain (e.g., `https://api.agritech.example.com`).

### 2.4 Configure Domains

In Coolify, assign domains to each service:

- **frontend**: `agritech.example.com` → port 80
- **backend**: `api.agritech.example.com` → port 8000

Coolify auto-provisions SSL certificates via Let's Encrypt.

### 2.5 Deploy

Click **Deploy** in Coolify. It will:
1. Clone the repository
2. Build both Docker images (multi-stage builds)
3. Start the services
4. Configure Traefik routing and SSL

The healthchecks ensure Coolify waits for services to be ready before routing traffic.

---

## File Structure

```
/
├── docker-compose.yml              # Coolify reads this
├── .env.example                    # Template for env vars
├── packages/
│   ├── frontend/
│   │   ├── Dockerfile              # Multi-stage: node build → nginx
│   │   └── nginx.conf              # SPA routing + caching + security headers
│   └── backend/
│       ├── Dockerfile              # Multi-stage: pip install → gunicorn
│       └── gunicorn.conf.py        # Production server config
└── docs/
    └── DEPLOYMENT.md               # This file
```

## Build Details

### Frontend Dockerfile

1. **Build stage**: Installs npm deps, runs `vite build` with `VITE_API_URL` baked in
2. **Production stage**: Copies built assets into nginx, serves with SPA fallback routing

### Backend Dockerfile

1. **Build stage**: Installs Python deps (including compiled ones like psycopg2)
2. **Production stage**: Copies installed packages + app code, runs Gunicorn with Uvicorn workers

### Gunicorn Config

- Workers: `2 * CPU cores + 1`
- Worker class: `uvicorn.workers.UvicornWorker` (ASGI)
- Timeout: 120s
- Runs as non-root `appuser`

## Updating

Push to your configured branch. Coolify auto-deploys on push if webhooks are configured, or you can manually trigger a redeploy from the Coolify dashboard.

## Troubleshooting

**Frontend shows blank page:**
Check that `VITE_API_URL` was set correctly at build time. Since it's baked into the bundle, you need to redeploy (not just restart) after changing it.

**Backend returns 500:**
Check that all required environment variables are set. View container logs in Coolify for details.

**CORS errors:**
Ensure `FRONTEND_URL` matches the exact origin of your frontend (including protocol and port if non-standard).

**Database connection refused:**
If using Coolify's built-in PostgreSQL, make sure the database service is on the same Docker network. Use the internal hostname provided by Coolify. If using RDS, ensure the security group allows inbound connections from your Coolify server's IP on port 5432.

**Cognito errors:**
Verify `COGNITO_USER_POOL_ID` and `COGNITO_CLIENT_ID` are correct. Ensure the IAM user's access keys (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`) are set and the policy grants the required Cognito admin actions.

**S3 presigned URL errors:**
Ensure the IAM user has `s3:GetObject` permission on the `agritech-simulations` bucket and that `AWS_REGION` matches the bucket's region.

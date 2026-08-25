<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

[circleci-image]: https://img.shields.io/circleci/build/github/nestjs/nest/master?token=abc123def456
[circleci-url]: https://circleci.com/gh/nestjs/nest

  <p align="center">A progressive <a href="http://nodejs.org" target="_blank">Node.js</a> framework for building efficient and scalable server-side applications.</p>
    <p align="center">
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/v/@nestjs/core.svg" alt="NPM Version" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/l/@nestjs/core.svg" alt="Package License" /></a>
<a href="https://www.npmjs.com/~nestjscore" target="_blank"><img src="https://img.shields.io/npm/dm/@nestjs/common.svg" alt="NPM Downloads" /></a>
<a href="https://circleci.com/gh/nestjs/nest" target="_blank"><img src="https://img.shields.io/circleci/build/github/nestjs/nest/master" alt="CircleCI" /></a>
<a href="https://discord.gg/G7Qnnhy" target="_blank"><img src="https://img.shields.io/badge/discord-online-brightgreen.svg" alt="Discord"/></a>
<a href="https://opencollective.com/nest#backer" target="_blank"><img src="https://opencollective.com/nest/backers/badge.svg" alt="Backers on Open Collective" /></a>
<a href="https://opencollective.com/nest#sponsor" target="_blank"><img src="https://opencollective.com/nest/sponsors/badge.svg" alt="Sponsors on Open Collective" /></a>
  <a href="https://paypal.me/kamilmysliwiec" target="_blank"><img src="https://img.shields.io/badge/Donate-PayPal-ff3f59.svg" alt="Donate us"/></a>
    <a href="https://opencollective.com/nest#sponsor"  target="_blank"><img src="https://img.shields.io/badge/Support%20us-Open%20Collective-41B883.svg" alt="Support us"></a>
  <a href="https://twitter.com/nestframework" target="_blank"><img src="https://img.shields.io/twitter/follow/nestframework.svg?style=social&label=Follow" alt="Follow us on Twitter"></a>
</p>
  <!--[![Backers on Open Collective](https://opencollective.com/nest/backers/badge.svg)](https://opencollective.com/nest#backer)
  [![Sponsors on Open Collective](https://opencollective.com/nest/sponsors/badge.svg)](https://opencollective.com/nest#sponsor)-->

## Description

[Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.

## Project setup

```bash
$ pnpm install
```

## Local database (PostgreSQL)

From the **repo root**:

```bash
pnpm db:up
cp apps/backend/.env.example apps/backend/.env   # if you don't have .env yet
pnpm migration:run
pnpm dev:backend
```

`DATABASE_URL` in `.env.example` points at the Docker Postgres on `localhost:5432`.

## Email

Copy [`.env.example`](./.env.example) to `.env` and set `COOKIE_KEY`, `FRONTEND_URL` (must match your frontend origin, e.g. `http://localhost:5173`).

Mail is sent via the [Resend HTTP API](https://resend.com/docs/api-reference/emails/send-email) (HTTPS port 443), which works on Render free tier — SMTP ports 25/465/587 are blocked there.

### Local dev

1. Create a [Resend](https://resend.com) account and API key.
2. Set `RESEND_API_KEY=re_…` and `MAIL_FROM="GoFunIo Dev <onboarding@resend.dev>"` (Resend sandbox sender for testing).
3. Run `pnpm run start:dev`. Signup, **resend verification**, and **forgot password** appear in the Resend dashboard **Emails** tab.

### Staging / production

1. **Verify your sending domain** in Resend (required — no shared sender in prod).
2. Create a separate API key per environment and set in Render:
   - `RESEND_API_KEY=re_…`
   - `MAIL_FROM="GoFunIo <no-reply@yourdomain.com>"` (must use the verified domain)
3. Remove any legacy `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS` env vars.
4. Redeploy and check delivery in the Resend dashboard **Emails** tab.

### Render setup checklist

1. Rotate any API key that was ever exposed (e.g. in screenshots or logs).
2. In Render → **Environment**:
   - Add `RESEND_API_KEY` (new key)
   - Keep/update `MAIL_FROM`
   - Delete `MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASS`
3. Redeploy the web service.
4. Resend verification:
   ```bash
   curl -X POST 'https://gofunio.onrender.com/auth/resend-verification' \
     -H 'Content-Type: application/json' \
     -d '{"token":"TOKEN_FROM_THE_LAST_VERIFICATION_LINK"}'
   ```
5. Confirm `204` response, then check Resend dashboard and inbox (including spam).

## Compile and run the project

```bash
# development
$ pnpm run start

# watch mode
$ pnpm run start:dev

# production mode
$ pnpm run start:prod
```

## Run tests

```bash
# unit tests
$ pnpm run test

# e2e tests
$ pnpm run test:e2e

# test coverage
$ pnpm run test:cov
```

## Deployment

When you're ready to deploy your NestJS application to production, there are some key steps you can take to ensure it runs as efficiently as possible. Check out the [deployment documentation](https://docs.nestjs.com/deployment) for more information.

If you are looking for a cloud-based platform to deploy your NestJS application, check out [Mau](https://mau.nestjs.com), our official platform for deploying NestJS applications on AWS. Mau makes deployment straightforward and fast, requiring just a few simple steps:

```bash
$ pnpm install -g @nestjs/mau
$ mau deploy
```

With Mau, you can deploy your application in just a few clicks, allowing you to focus on building features rather than managing infrastructure.

## Resources

Check out a few resources that may come in handy when working with NestJS:

- Visit the [NestJS Documentation](https://docs.nestjs.com) to learn more about the framework.
- For questions and support, please visit our [Discord channel](https://discord.gg/G7Qnnhy).
- To dive deeper and get more hands-on experience, check out our official video [courses](https://courses.nestjs.com/).
- Deploy your application to AWS with the help of [NestJS Mau](https://mau.nestjs.com) in just a few clicks.
- Visualize your application graph and interact with the NestJS application in real-time using [NestJS Devtools](https://devtools.nestjs.com).
- Need help with your project (part-time to full-time)? Check out our official [enterprise support](https://enterprise.nestjs.com).
- To stay in the loop and get updates, follow us on [X](https://x.com/nestframework) and [LinkedIn](https://linkedin.com/company/nestjs).
- Looking for a job, or have a job to offer? Check out our official [Jobs board](https://jobs.nestjs.com).

## Support

Nest is an MIT-licensed open source project. It can grow thanks to the sponsors and support by the amazing backers. If you'd like to join them, please [read more here](https://docs.nestjs.com/support).

## Stay in touch

- Author - [Kamil Myśliwiec](https://twitter.com/kammysliwiec)
- Website - [https://nestjs.com](https://nestjs.com/)
- Twitter - [@nestframework](https://twitter.com/nestframework)

## License

Nest is [MIT licensed](https://github.com/nestjs/nest/blob/master/LICENSE).

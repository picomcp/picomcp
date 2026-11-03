# Security policy

## Supported versions

Security fixes land on the latest minor release. Before 1.0, that means the latest `0.x` version.

## Reporting a vulnerability

Please do not open a public issue for a security problem.

Report it privately through GitHub: go to the repository's **Security** tab and choose **Report a vulnerability**. Include what you found, how to reproduce it and the impact you expect.

You will get an acknowledgement within 72 hours and a plan within a week. Once a fix is released, we will credit you in the release notes unless you prefer otherwise.

## Scope

In scope: the `picomcp` package, its CLI and its default behaviour, for example the HTTP origin checks or input validation.

Out of scope: vulnerabilities in servers built with picomcp, unless picomcp itself causes them. Tools you write receive input chosen by a model, which can be influenced by any content the model reads. Validate and authorise inside your tools as you would for any public API.

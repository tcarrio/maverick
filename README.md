[![npm (scoped)](https://img.shields.io/npm/v/@0xc/maverick)](https://www.npmjs.com/package/@0xc/maverick) [![npm](https://img.shields.io/npm/dt/@0xc/maverick)](https://www.npmjs.com/package/@0xc/maverick) [![GitHub issues](https://img.shields.io/github/issues/tcarrio/maverick)](https://github.com/tcarrio/maverick/issues) [![GitHub pull requests](https://img.shields.io/github/issues-pr/tcarrio/maverick)](https://github.com/tcarrio/maverick/pulls) ![Libraries.io dependency status for GitHub repo](https://img.shields.io/librariesio/github/tcarrio/maverick)

# Maverick

## Update 2020-01-22

This project is transitioning to a configurable and dynamic approach to the local docker-compose
development environment solution. This changes institutes an optional `maverick.yml` configuration
that goes in the root directory of the project. The `maverick.yml` offers functionality into the
dynamically generated `docker-compose.yml` buffer that is used for the internal `docker.compose`
commands. It segments Docker Compose services into the following categories:

  - images
  - infrastructure
  - batch
  - packages
  - services

### Images

Images exist only as a means of generating a required Docker image that can be referenced later.

### Infrastructure

Infrastructure automatically connects to the global generated network, and should be used for
definitions that orient around databases, message buses, etc. There are also certain infrastructure
services that are supported out of the box. To use the default configuration for a builtin infrastructure,
simply specific the key with a null, e.g. `mysql:`. Any provided configurations will be joined with
the defaults, so to set up a database with a specific root password, you only need to specify the
environment variable for the password under the `mysql.environment:` entry.

### Batch

Some operations only need to be done once. The batch category is a good location for putting in
one-off operations such as database updates, migrations, and more.

### Packages / Services

Packages are Docker Compose services that serve only to watch for source code changes to transpile.
On the other hand, services incorporate the transpiled source of dependencies. Only direct dependencies
are mounted to a service, providing a central location for packages to watch for changes and update when
a direct dependency is impacted by a source code change.

## Description

This project means to provide an easier manner of interacting with our docker-compose resources. The
CLI can be installed with `npm i -g $path_to_maverick_src`, and will automatically be updated whenever
the project is built. The following usage provides all the commands that can be performed with the
current CLI. Bootstrapping your project can be done by calling `maverick -i`, which will clone the
Moonraker project to the neighboring directory to Singularity.

## Features

Initialize your project with `maverick -i`. It will prompt you for a password. HTTPS is the default,
but the URL can be overridden by providing it as an argument.

Launch the fleet of containers with `maverick -u`. This can also receive individual service names.

Restart a service or the entire fleet with `maverick -r`.

Tear everything down with `maverick -d`. Applies to individual services as well.

Build any or all image again with `maverick -b`.

## Future Goals

Provide more functionality around services being managed, listing them, creating them, automating
the creation of new packages introduced, etc.

```
Usage: maverick [action]

Command your arsenal of Docker containers for ultimate development

Options:
  -V, --version                         output the version number
  -b, --build                           build all or certain services in the docker-compose.yml
  -d, --down                            take down all or certain services in the docker-compose.yml
  -u, --up                              launch a certain or all of the database, redis, and services
  -r, --restart                         restart service name(s)
  -R, --reload                          reload services with updates to env_file and docker-compose.yml
  -s, --setup                           runs the setup script provided by the project (default: false)
  -l, --list [filter]                   list services currently defined for local development
  -p, --ps                              List existing containers
  -n, --ngrok [subdomain] [auth_token]  Persist your subdomain and auth token to the Maverick config
  -g, --generate                        Generate a new Docker Compose using the maverick.yml config
  -h, --help                            output usage information
```

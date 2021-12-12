# Pager

## Instructions

```bash
# installation
$ yarn

# unit tests
$ yarn run test

# test coverage
$ yarn run test:cov

# static code scanning
$ yarn run lint
```

## Concurrency issues
What is expected from PersistanceAdapter implementations is to be able to handle events (MonitoredServiceState entity) following ACID principles. If any error happens it will return an exception.
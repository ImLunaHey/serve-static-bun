# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.4] - 2022-07-12

### Changes

- Won't look for an index file if the path is not a directory.

## [0.1.3] - 2022-07-12

### Changes

- Use `Bun.file` instead of `node:fs`.

### Removed

- `mime` dependency. Now uses `Bun.file(file).type`!
- `fileEncoding` option is gone, replaced by `charset` only.

## [0.1.1] - 2022-07-12

### Removed

- Source maps

## [0.1.0] - 2022-07-12

### Added

- Initial release
- Support for `Bun.serve`
- Support for `Bao.js`

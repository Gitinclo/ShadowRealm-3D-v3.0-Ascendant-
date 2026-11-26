# ShadowRealm 3D — v3.0 Ascendant task runner
set shell := ["bash", "-euo", "pipefail", "-c"]

default:
    @just --list

install:
    npm install

dev:
    npm run dev

lint:
    npm run lint

test:
    npm test

build-web:
    npm run build

check-cpp:
    printf '#include "Causality.h"\n' | g++ -std=c++17 -Wall -Wextra -Werror -x c++ -fsyntax-only -I. -

check: lint test build-web check-cpp

build-desktop:
    cmake -S . -B build -DCMAKE_BUILD_TYPE=Release
    cmake --build build --config Release --parallel

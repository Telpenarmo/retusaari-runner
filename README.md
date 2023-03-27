# Retusaari (Kotlin) Runner

A GUI application for running Kotlin scripts and watching their output live.
I built it with Tauri Framework, using Rust for the backend and TS + React for the frontend.

## Usage

The UI is quite minimal: there are two panes and two buttons.
On the left, you can write your code, and when it's ready, hit the **Run** button (or use *Ctrl+Enter*) shortcut.
The output of your script will appear in the right panel. Should `kotlinc` fail with some errors, there will also be displayed there.

### Features

- it works
- there's a **Stop** button to stop execution of the script
- `kotlinc` errors are highlighted, and clicking their locations moves the cursor into proper position.
- output panel is virtualized, so flooding it with output from some infinite loop won't be a problem
- keyboard shortcuts! *Ctrl+Enter* for **run** and *Ctrl+C* for **stop**

## Building

This should work on all thee major platforms (Linux, MacOs and Windows), but I have to admit that I only tested Linux.

### Requirements

The detailed instructions are availabe in Tauri docs ([prerequisites]).
Most notable dependencies are Rust and platform-specific toolchains like GTK, webkitgtk and some others on Linux.
Then you should install tauri-cli, for example with

```sh
cargo install tauri-cli
```

When it comes to the frontend, you'll need node.js and `pnpm` (its installation instructions are here: <https://pnpm.io/installation>).

Phew, that was quite a lot of dependencies!

### Development

I think this should be all. If everything is ready you can simply run

```sh
cargo tauri dev
```

or

```sh
pnpm tauri dev
```

and the development version will start.

### Production build

Independently of the OS you can run

```sh
(pnpm/cargo) tauri build
```

to get a bundle ready to run.
Note that on Linux and MacOs GUI apps have limited access to `$PATH`, so Retusaari run will fail, not being able to find `kotlinc`, if you try to run it from the file explorer.
Instead, you can run the binary from the terminal.
I think I have found a way to fix it, but that's not ready for the time being.

## FAQ

- Retussari is a name of the Kotlin island in Finnish.
- This app was created as a test task for a JetBrains internship.
- Ok, right, nobody asked those yet!

[prerequisites]: https://tauri.app/v1/guides/getting-started/prerequisites

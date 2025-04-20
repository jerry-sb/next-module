import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";

/**
 * @param input - entry file path (e.g., src/index.tsx)
 * @param output - { cjs: string, esm: string }
 */
export default function baseConfig(
  input = "src/index.tsx", // ✅ JSX 포함 파일이면 무조건 .tsx
  output = {
    cjs: "dist/index.cjs",
    esm: "dist/index.mjs",
  },
) {
  return {
    input,
    output: [
      { file: output.cjs, format: "cjs", sourcemap: true },
      { file: output.esm, format: "esm", sourcemap: true },
    ],
    plugins: [
      resolve(),
      commonjs(),
      typescript({
        tsconfig: "./tsconfig.json",
      }),
    ],
  };
}

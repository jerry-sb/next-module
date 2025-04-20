// packages/rollup-config/base-dts.mjs
import dts from "rollup-plugin-dts";

/**
 * DTS 전용 Rollup 설정
 * @param {string} entry 입력 경로
 * @param {string} output 출력 경로
 */
export default function dtsConfig(
   entry = "src/index.ts",
   output = "dist/index.d.ts"
) {
   return {
      input: entry,
      output: [{ file: output, format: "es" }],
      plugins: [dts()],
   };
}

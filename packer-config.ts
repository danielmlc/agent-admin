import process from "node:process";
import path from "node:path";

const isDevelopment = process.env.CS_SERVICEENV === "dev";

module.exports = {
  global: {
    cwd: __dirname,
    clear: [],
    copy: {
      "src/web-content/assets": "assets",
    },
    node: {
      rootOutPath: "dist/",
      packerConfig: {
        resolve: {
          alias: {
            "@app/config": path.resolve(__dirname, "libs/config/src"),
            "@app/common": path.resolve(__dirname, "libs/common/src"),
            "@app/redis": path.resolve(__dirname, "libs/redis/src"),
            "@app/sms": path.resolve(__dirname, "libs/sms/src"),
            "@app/captcha": path.resolve(__dirname, "libs/captcha/src"),
          },
          extensions: [".ts", ".tsx", ".js", ".json"],
        },
        node: {
          __dirname: false,
          __filename: false,
          global: true,
        },
        optimization: {
          moduleIds: "named",
        },
        externals: [
        ],
        ignoreWarnings: [
        ],
      },
    },
    browserVue3: {
      rootOutPath: "dist/",
      packerConfig: {
        resolve: {
          extensions: [".js", ".ts", ".json", ".tsx", ".vue"],
        },
        externals: {
          "vue": "Vue",
          "axios": "axios",
          "vue-router": "VueRouter",
          "element-plus": "ElementPlus",
          "@element-plus/icons-vue": "ElementPlusIconsVue",
        },
      },
    },
  },
  server: {
    port: 8080,
    staticPath: "dist/",
    prefix: "/api",
    packerConfig: {},
    proxy: {
      isEnable: false,
      sites: [
      ],
    },
  },
  entries: {
    server: {
      type: "node",
      name: "server",
      output: {
        fileName: "main.js",
        filePath: "dist/controllers",
      },
      input: "src/controllers/main.ts",
    },
    login: {
      type: "browserVue3",
      title: "登录 - XXXXX管理系统",
      template: "src/web-content/pages/login/index.html",
      input: "src/web-content/pages/login/index.ts",
    },
    home: {
      type: "browserVue3",
      title: "但以理 - 后台管理",
      template: "src/web-content/pages/home/index.html",
      input: "src/web-content/pages/home/index.ts",
    },
  },
};

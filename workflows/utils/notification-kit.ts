import path from "path";
import nodemailer from "nodemailer";
import axios from "axios";
import * as env from "./env.ts";
import pkg from "../package.json";

interface NotificationOptions {
  title: string;
  content: string;
  msgtype?: "text" | "html";
}

interface EmailOptions extends NotificationOptions {}
interface DingTalkOptions extends NotificationOptions {}
interface PushPlusOptions extends NotificationOptions {}
interface WeComOptions extends NotificationOptions {}
interface WeiXinOptions extends WeComOptions {}
interface FeiShuOptions extends NotificationOptions {}

export class NotificationKit {
  /**
   * 邮件推送
   * @param options
   */
  async email(options: EmailOptions) {
    const auth: { user: string | undefined; pass: string | undefined } = {
      user: env.EMAIL_USER, // generated ethereal user
      pass: env.EMAIL_PASS // generated ethereal password
    };

    if (!auth.user || !auth.pass || auth.user === "" || auth.pass === "") {
      throw new Error("未配置邮箱。");
    }

    const transporter = nodemailer.createTransport({
      host: "smtp." + (auth.user as any).match(/@(.*)/)[1],
      secure: true,
      port: 465,
      auth,
      tls: {
        // do not fail on invalid certs
        rejectUnauthorized: false
      }
    });

    const template = `
<style>
  .jj-header {
    padding: 10px 0;
    border-bottom: 1px solid #f1f1f1;
  }
  .jj-update-tip {
    display: flex;
    justify-content: space-between;
    padding: 10px;
    font-size: 12px;
    background: #fff4e5;
    color: #663c00;
    text-decoration: none;
  }
  .jj-main {
    padding: 10px;
  }
  .jj-footer {
    padding: 10px 0;
    border-top: 1px solid #f1f1f1;
    text-align: center;
    font-size: 12px;
    color: #6e6e73;
  }
</style>
<section>
  <header class="jj-header">
    <img src="cid:logo.svg" width="120" height="24" alt="稀土掘金" />
  </header>
  ${
    this.newVersion.has
      ? `<a class="jj-update-tip" href="${this.newVersion.url}" target="_blank"><span>稀土掘金助手 ${this.newVersion.name} 现在可用 ›</span></a>`
      : ""
  }
  <main class="jj-main">
    ${options.msgtype === "html" ? options.content : `<pre style="margin: 0;">${options.content}</pre>`}
  </main>
  <footer class="jj-footer">
    <span>稀土掘金助手v${pkg.version}</span> |
    <span>Copyright © ${new Date().getFullYear()} Derek Li.</span>
  </footer>
</section>
`.trim();

    await transporter.sendMail({
      from: `稀土掘金助手 <${auth.user}>`, // sender address（'"Fred Foo 👻" <foo@example.com>'）
      to: env.EMAIL_TO, // list of receivers
      subject: options.title, // Subject line
      // text, // plain text body
      html: template, // html body
      attachments: [
        {
          filename: "logo.svg",
          path: path.resolve(__dirname, "../resources/logo.svg"),
          cid: "logo.svg" //same cid value as in the html img src
        }
      ]
    });
  }

  /**
   * PushPlus推送
   * @param options
   */
  async pushplus(options: PushPlusOptions) {
    const token: string | unknown = env.PUSHPLUS_TOKEN;
    if (!token || token === "") {
      throw new Error("未配置PushPlus Token。");
    }

    const config = {
      token,
      title: options.title,
      content: options.content,
      topic: "",
      template: "html",
      channel: "wechat",
      webhook: "",
      callbackUrl: "",
      timestamp: ""
    };

    return axios.post("https://www.pushplus.plus/send", config, {
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  /**
   * serverPush推送
   * @param options
   */
  async serverPush(options: PushPlusOptions) {
    const token: string | unknown = env.SERVERPUSHKEY;
    if (!token || token === "") {
      throw new Error("未配置Server酱 key。");
    }

    const config = {
      title: options.title,
      desp: options.content,
      channel: "9"
    };

    return axios.post(`https://sctapi.ftqq.com/${token}.send`, config, {
      headers: {
        "Content-Type": "application/json"
      }
    });
  }

  /**
   * 钉钉Webhook
   * @param options
   */
  async dingtalkWebhook(options: DingTalkOptions) {
    const url: string | unknown = env.DINGDING_WEBHOOK;
    if (!url || url === "") {
      throw new Error("未配置钉钉Webhook。");
    }

    return axios.post(url as string, {
      msgtype: "text",
      text: {
        content: `${options.title}\n${options.content}`
      }
    });
  }

  /**
   * 飞书Webhook
   * @param options
   */
  async feishuWebhook(options: FeiShuOptions) {
    const url: string | unknown = env.FEISHU_WEBHOOK;
    if (!url || url === "") {
      throw new Error("未配置飞书Webhook。");
    }

    return axios.post(url as string, {
      msg_type: "interactive",
      card: {
        elements: [
          {
            tag: "markdown",
            content: options.content,
            text_align: "left"
          }
        ],
        header: {
          template: "blue",
          title: {
            content: options.title,
            tag: "plain_text"
          }
        }
      }
    });
  }

  /**
   * 企业微信Webhook
   * @param options
   */
  async wecomWebhook(options: WeComOptions) {
    const url: string | unknown = env.WEIXIN_WEBHOOK;
    if (!url || url === "") {
      throw new Error("未配置企业微信Webhook。");
    }

    return axios.post(url as string, {
      msgtype: "text",
      text: {
        content: `${options.title}\n${options.content}`
      }
    });
  }

  async weixinWebhook(options: WeiXinOptions) {
    return this.wecomWebhook(options);
  }

  newVersion = {
    has: false,
    name: pkg.version,
    url: pkg.homepage
  };

  async checkupdate() {
    try {
      const result = await axios.get(pkg.releases_url);
      const data = result.data[0];
      this.newVersion.has = pkg.version < data.tag_name.replace(/^v/, "");
      this.newVersion.name = data.tag_name;
    } catch (e) {}
  }

  async pushMessage(options: NotificationOptions) {
    const trycatch = async (name: string, fn: Function) => {
      try {
        await fn(options);
        console.log(`[${name}]: 消息推送成功!`);
      } catch (e: any) {
        console.log(`[${name}]: 消息推送失败! 原因: ${e.message}`);
      }
    };

    await this.checkupdate();
    if (this.newVersion.has) {
      console.log(`稀土掘金助手 ${this.newVersion.name} 现在可用`);
    }

    await trycatch("邮件", this.email.bind(this));
    await trycatch("钉钉", this.dingtalkWebhook.bind(this));
    await trycatch("微信", this.wecomWebhook.bind(this));
    await trycatch("PushPlus", this.pushplus.bind(this));
    await trycatch("Server酱", this.serverPush.bind(this));
    await trycatch("飞书", this.feishuWebhook.bind(this));
  }
}

export default new NotificationKit();

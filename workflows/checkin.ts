import notification from "./utils/notification-kit";
const JuejinHelper = require("juejin-helper");
import * as utils from "./utils/utils";
import * as env from "./utils/env";

class Task {
  juejin: any;

  constructor(juejin: any) {
    this.juejin = juejin;
  }

  taskName = "";

  async run(...args: any[]): Promise<void> { }

  toString() {
    return `[${this.taskName}]`;
  }
}

class GrowthTask extends Task {
  taskName = "成长任务";

  todayStatus = 0; // 未签到
  incrPoint = 0;
  sumPoint = 0; // 当前矿石数
  contCount = 0; // 连续签到天数
  sumCount = 0; // 累计签到天数

  async run() {
    const growth = this.juejin.growth();

    const todayStatus = await growth.getTodayStatus();
    if (!todayStatus) {
      let success = false;
      while (!success) {
        try {
          const checkInResult = await growth.checkIn();
          this.incrPoint = checkInResult.incr_point;
          this.sumPoint = checkInResult.sum_point;
          this.todayStatus = 1; // 本次签到
          success = true;
        } catch (e: any) {
          console.error("签到失败:", e.message);
          await utils.wait(1000); // 等待1秒后重试
        }
      }
    } else {
      this.todayStatus = 2; // 已签到
    }


    const counts = await growth.getCounts();
    this.contCount = counts.cont_count;
    this.sumCount = counts.sum_count;

    this.sumPoint = await growth.getCurrentPoint();
  }
}

class DipLuckyTask extends Task {
  taskName = "幸运值";

  luckyValue = 0;

  async run() {
    const growth = this.juejin.growth();

    const luckyResult = await growth.getMyLucky();
    this.luckyValue = luckyResult.total_value;
  }
}

class BugfixTask extends Task {
  taskName = "Bugfix";

  userOwnBug = 0;

  async run() {
    const bugfix = this.juejin.bugfix();

    const competition = await bugfix.getCompetition();
    const bugfixInfo = await bugfix.getUser(competition);
    this.userOwnBug = bugfixInfo.user_own_bug;
  }
}

class SdkTask extends Task {
  taskName = "埋点";

  async run() {
    const sdk = this.juejin.sdk();

    let sdkOk = false, growthOk = false, onloadOk = false;

    try {
      await sdk.slardarSDKSetting();
      sdkOk = true;
    } catch {}
    try {
      const result = await sdk.mockTrackGrowthEvent();
      growthOk = !!(result && result.e === 0);
    } catch {}
    try {
      const result = await sdk.mockTrackOnloadEvent();
      onloadOk = !!(result && result.e === 0);
    } catch {}

    const ok = [sdkOk, growthOk, onloadOk].filter(Boolean).length;
    console.log(`埋点: ${ok}/3 成功`);
  }
}

class CheckIn {
  cookie = "";
  username = "";
  growthTask!: GrowthTask;
  dipLuckyTask!: DipLuckyTask;
  bugfixTask!: BugfixTask;
  sdkTask!: SdkTask;

  constructor(cookie: string) {
    this.cookie = cookie;
  }

  async run() {
    const juejin = new JuejinHelper();
    try {
      await juejin.login(this.cookie);
    } catch (e: any) {
      console.error(e.message);
      throw new Error("登录失败, 请尝试更新Cookies!");
    }

    this.username = juejin.getUser()!.user_name;

    this.growthTask = new GrowthTask(juejin);
    this.dipLuckyTask = new DipLuckyTask(juejin);
    this.bugfixTask = new BugfixTask(juejin);
    this.sdkTask = new SdkTask(juejin);

    await this.sdkTask.run();
    await this.growthTask.run();
    await this.dipLuckyTask.run();
    await this.bugfixTask.run();
    await juejin.logout();
    console.log("-------------------------");

    return this.growthTask.todayStatus;
  }

  toString() {
    const statusMap: Record<number, string> = {
      0: "签到失败",
      1: `签到成功 +${this.growthTask.incrPoint} 矿石`,
      2: "今日已完成签到"
    };

    return `
      ${statusMap[this.growthTask.todayStatus] || ""}
        掘友: ${this.username}
        连续签到天数 ${this.growthTask.contCount}
        累计签到天数 ${this.growthTask.sumCount}
        当前矿石数 ${this.growthTask.sumPoint}
        当前未消除Bug数量 ${this.bugfixTask.userOwnBug}
        当前幸运值 ${this.dipLuckyTask.luckyValue}/6000
        `.trim();
  }
}

async function run() {
  const cookies = utils.getUsersCookie(env);
  const messageList: string[] = [];
  for (const cookie of cookies) {
    const checkin = new CheckIn(cookie);

    await utils.wait(utils.randomRangeNumber(1000, 5000)); // 初始等待1-5s
    await checkin.run(); // 执行

    const content = checkin.toString();
    console.log(content); // 打印结果

    messageList.push(content);
  }

  const message = messageList.join(`\n${"-".repeat(15)}\n`);
  notification.pushMessage({
    title: "掘金每日签到",
    content: message,
    msgtype: "text"
  });
}

run().catch((error: Error) => {
  notification.pushMessage({
    title: "掘金每日签到",
    content: `<strong>Error</strong><pre>${error.message}</pre>`,
    msgtype: "html"
  });

  throw error;
});
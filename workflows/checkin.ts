import notification from "./utils/notification-kit.ts";
const JuejinHelper = require("juejin-helper");
import * as utils from "./utils/utils.ts";
import * as env from "./utils/env.ts";

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

class LotteriesTask extends Task {
  taskName = "抽奖";

  lottery: any[] = []; // 奖池
  pointCost = 0; // 一次抽奖消耗
  freeCount = 0; // 免费抽奖次数
  drawLotteryHistory: Record<string, number> = {};
  lotteryCount = 0;
  luckyValueProbability = 0;

  async run(growthTask: GrowthTask, dipLuckyTask: DipLuckyTask) {
    const growth = this.juejin.growth();

    const lotteryConfig = await growth.getLotteryConfig();
    this.lottery = lotteryConfig.lottery;
    this.pointCost = lotteryConfig.point_cost;
    this.freeCount = lotteryConfig.free_count;
    this.lotteryCount = 0;

    let freeCount = this.freeCount;
    while (freeCount > 0) {
      const result = await growth.drawLottery();
      this.drawLotteryHistory[result.lottery_id] = (this.drawLotteryHistory[result.lottery_id] || 0) + 1;
      dipLuckyTask.luckyValue = result.total_lucky_value;
      freeCount--;
      this.lotteryCount++;
      await utils.wait(utils.randomRangeNumber(300, 1000));
    }

    growthTask.sumPoint = await growth.getCurrentPoint();

    const getProbabilityOfWinning = (sumPoint: number) => {
      const pointCost = this.pointCost;
      const luckyValueCost = 10;
      const totalDrawsNumber = sumPoint / pointCost;
      let supplyPoint = 0;
      for (let i = 0, length = Math.floor(totalDrawsNumber * 0.65); i < length; i++) {
        supplyPoint += Math.ceil(Math.random() * 100);
      }
      const luckyValue = ((sumPoint + supplyPoint) / pointCost) * luckyValueCost + dipLuckyTask.luckyValue;
      return luckyValue / 6000;
    };

    this.luckyValueProbability = getProbabilityOfWinning(growthTask.sumPoint);
  }
}

class SdkTask extends Task {
  taskName = "埋点";

  calledSdkSetting = false;
  calledTrackGrowthEvent = false;
  calledTrackOnloadEvent = false;

  async run() {
    console.log("------事件埋点追踪-------");

    const sdk = this.juejin.sdk();

    try {
      await sdk.slardarSDKSetting();
      this.calledSdkSetting = true;
    } catch {
      this.calledSdkSetting = false;
    }
    console.log(`SDK状态: ${this.calledSdkSetting ? "加载成功" : "加载失败"}`);

    try {
      const result = await sdk.mockTrackGrowthEvent();
      if (result && result.e === 0) {
        this.calledTrackGrowthEvent = true;
      } else {
        throw result;
      }
    } catch {
      this.calledTrackGrowthEvent = false;
    }
    console.log(`成长API事件埋点: ${this.calledTrackGrowthEvent ? "调用成功" : "调用失败"}`);

    try {
      const result = await sdk.mockTrackOnloadEvent();
      if (result && result.e === 0) {
        this.calledTrackOnloadEvent = true;
      } else {
        throw result;
      }
    } catch {
      this.calledTrackOnloadEvent = false;
    }
    console.log(`OnLoad事件埋点: ${this.calledTrackOnloadEvent ? "调用成功" : "调用失败"}`);

    console.log("-------------------------");
  }
}

class CheckIn {
  cookie = "";
  username = "";
  growthTask!: GrowthTask;
  dipLuckyTask!: DipLuckyTask;
  lotteriesTask!: LotteriesTask;
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
    this.lotteriesTask = new LotteriesTask(juejin);
    this.bugfixTask = new BugfixTask(juejin);
    this.sdkTask = new SdkTask(juejin);

    await this.sdkTask.run();
    console.log(`运行 ${this.growthTask.taskName}`);
    await this.growthTask.run();
    console.log(`运行 ${this.dipLuckyTask.taskName}`);
    await this.dipLuckyTask.run();
    console.log(`运行 ${this.lotteriesTask.taskName}`);
    await this.lotteriesTask.run(this.growthTask, this.dipLuckyTask);
    console.log(`运行 ${this.bugfixTask.taskName}`);
    await this.bugfixTask.run();
    await juejin.logout();
    console.log("-------------------------");

    return this.growthTask.todayStatus;
  }

  toString() {

    console.log('this.lotteriesTask.drawLotteryHistory --->', this.lotteriesTask.drawLotteryHistory);
    const drawLotteryHistory = Object.entries(this.lotteriesTask.drawLotteryHistory)
      .map(([lottery_id, count]) => {
        const lotteryItem = this.lotteriesTask.lottery.find((item: any) => item.lottery_id == lottery_id);
        if (lotteryItem) {
          return `${lotteryItem.lottery_name}: ${count}`;
        }
        return `${lottery_id}: ${count}`;
      })
      .join("\n");

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
        预测All In矿石累计幸运值比率 ${(this.lotteriesTask.luckyValueProbability * 100).toFixed(2) + "%"}
        抽奖总次数 ${this.lotteriesTask.lotteryCount}
        免费抽奖次数 ${this.lotteriesTask.freeCount}
        ${this.lotteriesTask.lotteryCount > 0 ? "==============\n" + drawLotteryHistory + "\n==============" : ""}
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
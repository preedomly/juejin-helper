import notification from "./utils/notification-kit";
const JuejinHelper = require("juejin-helper");
import * as utils from "./utils/utils";
import * as env from "./utils/env";

class LotteryTask {
  juejin: any;

  constructor(juejin: any) {
    this.juejin = juejin;
  }

  lottery: any[] = [];
  pointCost = 0;
  freeCount = 0;
  drawLotteryHistory: Record<string, number> = {};
  lotteryCount = 0;
  luckyValue = 0;
  sumPoint = 0;
  lotteryOreGained = 0;

  async run() {
    const growth = this.juejin.growth();

    const lotteryConfig = await growth.getLotteryConfig();
    this.lottery = lotteryConfig.lottery;
    this.pointCost = lotteryConfig.point_cost;
    this.freeCount = lotteryConfig.free_count;
    this.lotteryCount = 0;
    this.lotteryOreGained = 0;

    let freeCount = this.freeCount;
    while (freeCount > 0) {
      const result = await growth.drawLottery();
      this.drawLotteryHistory[result.lottery_id] = (this.drawLotteryHistory[result.lottery_id] || 0) + 1;
      this.lotteryOreGained += result.incr_point || 0;
      this.luckyValue = result.total_lucky_value;
      freeCount--;
      this.lotteryCount++;
      await utils.wait(utils.randomRangeNumber(300, 1000));
    }

    this.sumPoint = await growth.getCurrentPoint();
  }

  toString() {
    if (this.lotteryCount === 0) {
      return `
        今日已无免费抽奖次数
        当前矿石数 ${this.sumPoint}
        当前幸运值 ${this.luckyValue}/6000
        `.trim();
    }

    const drawLotteryHistory = Object.entries(this.drawLotteryHistory)
      .map(([lottery_id, count]) => {
        const lotteryItem = this.lottery.find((item: any) => item.lottery_id == lottery_id);
        if (lotteryItem) {
          return `${lotteryItem.lottery_name}: ${count}`;
        }
        return `${lottery_id}: ${count}`;
      })
      .join("\n");

    const getProbabilityOfWinning = (sumPoint: number) => {
      const pointCost = this.pointCost;
      const luckyValueCost = 10;
      const totalDrawsNumber = sumPoint / pointCost;
      let supplyPoint = 0;
      for (let i = 0, length = Math.floor(totalDrawsNumber * 0.65); i < length; i++) {
        supplyPoint += Math.ceil(Math.random() * 100);
      }
      const luckyValue = ((sumPoint + supplyPoint) / pointCost) * luckyValueCost + this.luckyValue;
      return luckyValue / 6000;
    };

    const luckyValueProbability = getProbabilityOfWinning(this.sumPoint);

    return `
        当前矿石数 ${this.sumPoint}
        当前幸运值 ${this.luckyValue}/6000
        预测All In矿石累计幸运值比率 ${(luckyValueProbability * 100).toFixed(2) + "%"}
        抽奖总次数 ${this.lotteryCount}
        免费抽奖次数 ${this.freeCount}
        ${this.lotteryOreGained > 0 ? `抽奖获得矿石 ${this.lotteryOreGained}` : ""}
        ==============
        ${drawLotteryHistory}
        ==============
        `.trim();
  }
}

async function run() {
  const cookies = utils.getUsersCookie(env);
  const messageList: string[] = [];
  for (const cookie of cookies) {
    const juejin = new JuejinHelper();
    try {
      await juejin.login(cookie);
    } catch (e: any) {
      console.error(e.message);
      continue;
    }

    const username = juejin.getUser()!.user_name;
    const lotteryTask = new LotteryTask(juejin);
    await lotteryTask.run();

    const content = `掘友: ${username}\n${lotteryTask.toString()}`;
    console.log(content);
    messageList.push(content);

    await juejin.logout();
    await utils.wait(utils.randomRangeNumber(1000, 5000));
  }

  const message = messageList.join(`\n${"-".repeat(15)}\n`);
  notification.pushMessage({
    title: "掘金免费抽奖",
    content: message,
    msgtype: "text"
  });
}

run().catch((error: Error) => {
  notification.pushMessage({
    title: "掘金免费抽奖",
    content: `<strong>Error</strong><pre>${error.message}</pre>`,
    msgtype: "html"
  });
  throw error;
});
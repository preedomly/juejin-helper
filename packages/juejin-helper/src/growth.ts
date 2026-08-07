import JuejinHelper from "./index";
import { AxiosInstance } from "axios";
import { createJuejinApi } from "./utils/http";

class Growth {
  http: AxiosInstance;

  constructor(juejin: JuejinHelper) {
    this.http = createJuejinApi(juejin);
  }

  /**
   * 获取统计签到天数
   * @returns {Promise<*>}
   * {
   *   cont_count 连续签到天数
   *   sum_count 累计签到天数
   * }
   */
  async getCounts(): Promise<{
    cont_count: number;
    sum_count: number;
  }> {
    return this.http.get("/growth_api/v1/get_counts");
  }

  /**
   * 获取当前矿石数
   * @returns {Promise<*>}
   * number 当前矿石数
   */
  async getCurrentPoint() {
    return this.http.get("/growth_api/v1/get_cur_point");
  }

  /**
   * 获取今日签到状态
   * @returns {Promise<*>}
   * boolean 是否签到
   */
  async getTodayStatus() {
    return this.http.get("/growth_api/v1/get_today_status");
  }

  /**
   * 获取月签到日历
   * @returns {Promise<*>}
   * [
   *   {
   *     date: timestamp(格式1646150400)
   *     point: number增加矿石数
   *     status: enum(1 今日, 4 未签到, 3 已签到)
   *   }
   * ]
   */
  async getByMonth() {
    return this.http.get("/growth_api/v1/get_by_month");
  }

  async getLotteryConfig() {
    return this.http.get("/growth_api/v1/lottery_config/get");
  }

  async drawLottery() {
    return this.http.post("/growth_api/v1/lottery/draw");
  }

  async checkIn() {
    return this.http.post("/growth_api/v1/check_in");
  }

  async getLotteriesLuckyUsers(data?: { page_no: number; page_size: number }): Promise<{
    count: number;
    lotteries: Array<{
      history_id: number;
      [prop: string]: any;
    }>;
  }> {
    const { page_no = 1, page_size = 5 } = data || {};
    return this.http.post("/growth_api/v1/lottery_history/global_big", {
      page_no: page_no,
      page_size: page_size
    });
  }

  async dipLucky(lottery_history_id: number): Promise<{
    has_dip: boolean;
    dip_value: number;
  }> {
    return this.http.post("/growth_api/v1/lottery_lucky/dip_lucky", {
      lottery_history_id
    });
  }

  async getMyLucky() {
    return this.http.post("/growth_api/v1/lottery_lucky/my_lucky");
  }
}

export default Growth;

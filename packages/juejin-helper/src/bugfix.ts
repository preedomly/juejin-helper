import { wait, randomRangeNumber } from "./utils/index";
import JuejinHelper from "./index";
import { JuejinApiClient, createJuejinApi } from "./utils/http";

interface Bug {
  bug_type: number; // 类型位置
  bug_time: number; // 时间戳
  bug_show_type: number; // 显示类型
  is_first: boolean; // 是否第一次
}

interface Competition {
  competition_id: number;
  [prop: string]: any;
}

interface User {
  user_own_bug: number;
  [prop: string]: any;
}

class Bugfix {
  http: JuejinApiClient;

  constructor(juejin: JuejinHelper) {
    this.http = createJuejinApi(juejin);
  }

  /**
   * 获取竞赛信息
   * @returns {Promise<Competition>}
   */
  async getCompetition(): Promise<Competition> {
    return this.http.post("/user_api/v1/bugfix/competition", {
      // 必须加个空对象，否则接口提示少了参数
    });
  }

  /**
   * 获取用户信息
   * @param data
   * @returns {Promise<User>}
   */
  async getUser(data: { competition_id: number }): Promise<User> {
    const { competition_id } = data;
    return this.http.post("/user_api/v1/bugfix/user", {
      competition_id
    });
  }

  /**
   * 获取未收集的Bug
   * @returns {Promise<Bug[]>}
   */
  async getNotCollectBugList(): Promise<Bug[]> {
    return this.http.post("/user_api/v1/bugfix/not_collect", {
      // 必须加个空对象，否则接口提示少了参数
    });
  }

  /**
   * 收集Bug
   * @param bug_time
   * @param bug_type
   * @returns {Promise<*>}
   */
  async collectBug(data: Bug) {
    const { bug_time, bug_type } = data;
    return this.http.post("/user_api/v1/bugfix/collect", {
      bug_time,
      bug_type
    });
  }

  /**
   * 批量收集Bug
   * @param buglist
   * @returns {Promise<boolean|*>}
   */
  async collectBugBatch(buglist: Bug[] = []): Promise<boolean | unknown> {
    try {
      for (const bug of buglist) {
        await this.collectBug(bug);
        await wait(randomRangeNumber(500, 1000));
      }
      return true;
    } catch (error) {
      return error;
    }
  }
}

export default Bugfix;

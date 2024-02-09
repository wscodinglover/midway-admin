import { Rule, RuleType } from '@midwayjs/validate'
/**
 * 登录参数校验
 */
export class LoginDTO {
  // 用户名
  @Rule(RuleType.string().required())
  username: string

  // 密码
  @Rule(RuleType.string().required())
  password: string

  // 验证码ID
  @Rule(RuleType.string().required())
  captchaId: string

  // 验证码
  @Rule(RuleType.string().required())
  code: number
}

/**
 * 注册参数校验
 */
export class UserDTO {
  // 用户名
  @Rule(RuleType.string().required())
  username: string

  // 密码
  @Rule(RuleType.string().required())
  password: string

  // 真实姓名
  @Rule(RuleType.string())
  realname: string

  // 昵称
  @Rule(RuleType.string())
  nickname: string

  // 角色Id
  @Rule(RuleType.string().required())
  roleId: string
}

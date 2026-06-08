"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { authAPI, setToken, setUser, getToken, getUser } from "@/lib/api"
import { toast } from "@/hooks/use-toast"

const authFieldClassName =
  "h-10 rounded-[10px] border-black/[0.10] bg-[#f3f4f7] px-3 text-[13px] shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] placeholder:text-[#8b8f97] focus-visible:border-[#007aff]/60 focus-visible:bg-white focus-visible:ring-[3px] focus-visible:ring-[#007aff]/15 dark:border-white/[0.10] dark:bg-[#1b1c20] dark:shadow-none dark:placeholder:text-white/35 dark:focus-visible:bg-[#1d1e22]"

const authPrimaryButtonClassName =
  "h-10 rounded-[10px] bg-[#007aff] text-[13px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28)] hover:bg-[#0071e3] active:translate-y-px dark:bg-[#0a84ff] dark:text-white dark:hover:bg-[#1991ff]"

const authGhostButtonClassName =
  "h-7 rounded-[8px] px-2.5 text-[12px] font-medium text-[#007aff] hover:bg-[#007aff]/10 hover:text-[#006bd6] dark:text-[#67b7ff] dark:hover:bg-white/[0.06] dark:hover:text-[#8bc8ff]"

const authLabelClassName = "text-[12px] font-medium text-foreground/78"

const authTabClassName =
  "h-full rounded-[7px] text-[13px] font-medium text-muted-foreground data-[state=active]:bg-[#fbfbfd] data-[state=active]:text-foreground data-[state=active]:shadow-[0_1px_3px_rgba(0,0,0,0.13)] dark:data-[state=active]:border-transparent dark:data-[state=active]:bg-[#34363b] dark:data-[state=active]:shadow-none"

type AuthFieldProps = React.ComponentProps<typeof Input> & {
  id: string
  label: string
}

function AuthField({ id, label, className, ...props }: AuthFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className={authLabelClassName}>
        {label}
      </Label>
      <Input
        id={id}
        className={`${authFieldClassName} ${className ?? ""}`}
        {...props}
      />
    </div>
  )
}

function WorkspacePreview() {
  return (
    <div
      aria-hidden="true"
      className="mt-8 rounded-[18px] border border-black/[0.07] bg-[#f9fafc] p-3 shadow-[0_16px_42px_rgba(53,62,78,0.14)] dark:border-white/[0.07] dark:bg-[#1b1c20] dark:shadow-none"
    >
      <div className="flex items-center gap-2 border-b border-black/[0.06] pb-3 dark:border-white/[0.07]">
        <div className="size-6 rounded-[7px] bg-[#dfe7f5] shadow-[inset_0_0_0_1px_rgba(0,122,255,0.10)] dark:bg-[#0a84ff]/18" />
        <div className="h-2 w-20 rounded-full bg-[#cfd4dd] dark:bg-white/[0.14]" />
        <div className="ml-auto size-5 rounded-full bg-[#eceff4] dark:bg-white/[0.08]" />
      </div>
      <div className="grid grid-cols-[70px_1fr] gap-3 pt-3">
        <div className="space-y-2">
          <div className="h-8 rounded-[10px] bg-[#007aff]/12 shadow-[inset_0_0_0_1px_rgba(0,122,255,0.08)] dark:bg-[#0a84ff]/18" />
          <div className="h-8 rounded-[10px] bg-[#eef0f4] dark:bg-white/[0.055]" />
          <div className="h-8 rounded-[10px] bg-[#eef0f4] dark:bg-white/[0.055]" />
          <div className="h-8 rounded-[10px] bg-[#eef0f4] dark:bg-white/[0.055]" />
        </div>
        <div className="rounded-[15px] border border-black/[0.06] bg-white p-3 dark:border-white/[0.07] dark:bg-[#222328]">
          <div className="mb-4 flex items-center justify-between">
            <div className="h-2 w-24 rounded-full bg-[#cfd4dd] dark:bg-white/[0.14]" />
            <div className="h-5 w-12 rounded-full bg-[#edf0f5] dark:bg-white/[0.08]" />
          </div>
          <div className="space-y-2">
            <div className="h-2 w-full rounded-full bg-[#e2e5eb] dark:bg-white/[0.10]" />
            <div className="h-2 w-10/12 rounded-full bg-[#e7e9ee] dark:bg-white/[0.075]" />
            <div className="h-2 w-7/12 rounded-full bg-[#e7e9ee] dark:bg-white/[0.075]" />
          </div>
          <div className="mt-5 ml-auto h-8 w-24 rounded-[11px] bg-[#007aff]/14 shadow-[inset_0_0_0_1px_rgba(0,122,255,0.06)] dark:bg-[#0a84ff]/24" />
          <div className="mt-3 h-8 rounded-[11px] bg-[#f1f3f7] dark:bg-white/[0.055]" />
        </div>
      </div>
    </div>
  )
}

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [loginAccount, setLoginAccount] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [registerAccount, setRegisterAccount] = useState("")
  const [registerPassword, setRegisterPassword] = useState("")
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("")
  const [registerNickname, setRegisterNickname] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [redirectPath, setRedirectPath] = useState("/")
  const [authMode, setAuthMode] = useState<"login" | "register">("login")

  useEffect(() => {
    const redirect = searchParams.get('redirect')
    if (redirect && redirect !== '/login') {
      setRedirectPath(redirect)
    }

    const user = getUser()
    const token = getToken()
    if (user && token) {
      router.replace(redirect && redirect !== '/login' ? redirect : '/')
    }
  }, [searchParams, router])

  const handleLoginSuccess = (data: { uid: number; token: string; nickname: string }) => {
    setToken(data.token)
    setUser({
      uid: data.uid,
      nickname: data.nickname,
    })

    toast({
      title: "登录成功",
      description: `欢迎回来，${data.nickname}！`,
    })

    router.push(redirectPath)
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const data = await authAPI.login({
        account: loginAccount,
        password: loginPassword,
      })

      handleLoginSuccess(data)
    } catch (error: any) {
      toast({
        title: "登录失败",
        description: error.message || "请检查账号和密码",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    if (registerPassword !== registerConfirmPassword) {
      toast({
        title: "密码不一致",
        description: "两次输入的密码不一致，请重新输入",
      })
      return
    }

    if (registerPassword.length < 6) {
      toast({
        title: "密码太短",
        description: "密码至少需要6个字符",
      })
      return
    }

    setIsLoading(true)

    try {
      const data = await authAPI.register({
        account: registerAccount,
        password: registerPassword,
        nickname: registerNickname || undefined,
      })

      handleLoginSuccess(data)

      toast({
        title: "注册成功",
        description: `欢迎，${data.nickname}！`,
      })
    } catch (error: any) {
      toast({
        title: "注册失败",
        description: error.message || "注册时出现错误",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleVisitorLogin = async () => {
    setIsLoading(true)

    try {
      let deviceId = localStorage.getItem('device_id')
      if (!deviceId) {
        deviceId = `web_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
        localStorage.setItem('device_id', deviceId)
      }

      const data = await authAPI.visitorLogin(deviceId)
      handleLoginSuccess(data)
    } catch (error: any) {
      toast({
        title: "游客登录失败",
        description: error.message || "请稍后重试",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-[#eceef2] px-5 py-8 dark:bg-[#17181b]">
      <main className="w-full max-w-[820px]">
        <section className="grid overflow-hidden rounded-[22px] border border-black/[0.08] bg-[#f7f8fa] shadow-[0_28px_88px_rgba(35,42,54,0.18)] dark:border-white/[0.08] dark:bg-[#202124] dark:shadow-[0_28px_74px_rgba(0,0,0,0.48)] md:grid-cols-[0.96fr_1.04fr]">
          <aside className="hidden min-h-[468px] flex-col border-r border-black/[0.07] bg-[#eef0f4] p-7 dark:border-white/[0.07] dark:bg-[#202124] md:flex">
            <div className="flex items-center gap-3">
              <div className="flex size-16 items-center justify-center rounded-[17px] border border-black/[0.06] bg-white shadow-[0_12px_30px_rgba(36,44,58,0.16)] dark:border-white/[0.10] dark:bg-[#2b2c31] dark:shadow-none">
                <img
                  src="/juno-logo-mark.svg"
                  alt=""
                  aria-hidden="true"
                  className="size-[56px] rounded-[15px]"
                />
              </div>
              <div>
                <h1 className="text-[25px] font-semibold leading-tight text-foreground">
                  Juno
                </h1>
                <p className="mt-1 text-[13px] text-muted-foreground">
                  AI 助手工作台
                </p>
              </div>
            </div>

            <WorkspacePreview />

            <div className="mt-auto flex items-center gap-2 border-t border-black/[0.06] pt-4 text-[12px] text-muted-foreground dark:border-white/[0.07]">
              <span className="size-1.5 rounded-full bg-[#30d158]" />
              <span>准备就绪</span>
            </div>
          </aside>

          <div className="bg-[#fbfbfd] p-5 sm:p-7 md:p-8 dark:bg-[#242529]">
            <div className="mx-auto flex min-h-[418px] w-full max-w-[326px] flex-col justify-center">
              <div className="mb-6 flex items-center gap-3 md:hidden">
                <div className="flex size-12 items-center justify-center rounded-[14px] border border-black/[0.06] bg-white shadow-[0_8px_22px_rgba(36,44,58,0.12)] dark:border-white/[0.10] dark:bg-[#2b2c31] dark:shadow-none">
                  <img
                    src="/juno-logo-mark.svg"
                    alt=""
                    aria-hidden="true"
                    className="size-10 rounded-[12px]"
                  />
                </div>
                <div>
                  <p className="text-[18px] font-semibold leading-tight text-foreground">
                    Juno
                  </p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground">
                    AI 助手工作台
                  </p>
                </div>
              </div>

              <div className="mb-5">
                <h2 className="text-[22px] font-semibold leading-tight text-foreground">
                  {authMode === "login" ? "欢迎回来" : "创建 Juno 账户"}
                </h2>
                <p className="mt-1.5 text-[13px] text-muted-foreground">
                  {authMode === "login" ? "登录后继续使用 Juno" : "设置账号后即可进入"}
                </p>
              </div>

              <Tabs
                value={authMode}
                onValueChange={(value) => setAuthMode(value as "login" | "register")}
                className="w-full gap-0"
              >
                <TabsList className="mb-5 grid h-8 w-[174px] grid-cols-2 rounded-[9px] border border-black/[0.08] bg-[#e9eaee] p-0.5 dark:border-white/[0.08] dark:bg-[#1d1e22]">
                  <TabsTrigger value="login" className={authTabClassName}>
                    登录
                  </TabsTrigger>
                  <TabsTrigger value="register" className={authTabClassName}>
                    注册
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-0">
                  <form onSubmit={handleLogin} className="space-y-3.5">
                    <AuthField
                      id="login-account"
                      label="账号"
                      type="text"
                      placeholder="请输入账号"
                      value={loginAccount}
                      onChange={(e) => setLoginAccount(e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                    />
                    <AuthField
                      id="login-password"
                      label="密码"
                      type="password"
                      placeholder="请输入密码"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="current-password"
                    />
                    <Button
                      type="submit"
                      className={`mt-1 w-full ${authPrimaryButtonClassName}`}
                      disabled={isLoading}
                    >
                      {isLoading ? "登录中..." : "登录"}
                    </Button>
                  </form>

                  <div className="mt-4 flex items-center justify-between rounded-[12px] border border-black/[0.07] bg-[#f4f5f8] px-3 py-2 dark:border-white/[0.08] dark:bg-[#1f2024]">
                    <span className="text-[12px] text-muted-foreground">
                      暂不登录
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      className={authGhostButtonClassName}
                      onClick={handleVisitorLogin}
                      disabled={isLoading}
                    >
                      {isLoading ? "登录中..." : "游客访问"}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="register" className="mt-0">
                  <form onSubmit={handleRegister} className="space-y-3.5">
                    <AuthField
                      id="register-account"
                      label="账号"
                      type="text"
                      placeholder="请输入账号"
                      value={registerAccount}
                      onChange={(e) => setRegisterAccount(e.target.value)}
                      required
                      disabled={isLoading}
                      minLength={3}
                      maxLength={50}
                      autoComplete="username"
                      autoCapitalize="none"
                      autoCorrect="off"
                    />
                    <AuthField
                      id="register-nickname"
                      label="昵称（可选）"
                      type="text"
                      placeholder="不填则自动生成"
                      value={registerNickname}
                      onChange={(e) => setRegisterNickname(e.target.value)}
                      disabled={isLoading}
                      maxLength={30}
                      autoComplete="nickname"
                    />
                    <AuthField
                      id="register-password"
                      label="密码"
                      type="password"
                      placeholder="至少6个字符"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      minLength={6}
                      autoComplete="new-password"
                    />
                    <AuthField
                      id="register-confirm-password"
                      label="确认密码"
                      type="password"
                      placeholder="再次输入密码"
                      value={registerConfirmPassword}
                      onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      autoComplete="new-password"
                    />
                    <Button
                      type="submit"
                      className={`mt-1 w-full ${authPrimaryButtonClassName}`}
                      disabled={isLoading}
                    >
                      {isLoading ? "注册中..." : "注册"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

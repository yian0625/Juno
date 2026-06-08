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
  "h-9 rounded-[9px] border-[color:var(--juno-hairline)] bg-[#fdfdff] px-3 text-[13px] shadow-[inset_0_1px_1px_rgba(0,0,0,0.03)] placeholder:text-muted-foreground/70 focus-visible:border-[#0a84ff]/60 focus-visible:ring-[rgba(10,132,255,0.18)] dark:border-white/[0.10] dark:bg-[#1f2024] dark:shadow-none"

const authPrimaryButtonClassName =
  "h-9 rounded-[9px] bg-[#0a84ff] text-[13px] font-medium text-white shadow-none hover:bg-[#0071e3] dark:bg-[#0a84ff] dark:text-white dark:hover:bg-[#1f8fff]"

const authGhostButtonClassName =
  "h-8 w-full rounded-[8px] text-[13px] font-medium text-muted-foreground hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.06]"

const authLabelClassName = "text-[12px] font-medium text-foreground/80"

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
    <div className="flex min-h-[100dvh] items-center justify-center overflow-y-auto bg-[#f5f5f7] px-5 py-8 dark:bg-[#1d1d1f]">
      <main className="w-full max-w-[356px]">
        <div className="mb-5 flex flex-col items-center text-center">
          <div className="flex size-14 items-center justify-center rounded-[15px] border border-black/[0.06] bg-white shadow-[0_8px_22px_rgba(0,0,0,0.10)] dark:border-white/[0.10] dark:bg-[#2a2b30] dark:shadow-none">
            <img
              src="/juno-logo-mark.svg"
              alt=""
              aria-hidden="true"
              className="size-12 rounded-[13px]"
            />
          </div>
          <h1 className="mt-3 text-[22px] font-semibold text-foreground">Juno</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">AI 助手工作台</p>
        </div>

        <section className="rounded-[18px] border border-[color:var(--juno-hairline)] bg-[#fbfbfd] p-4 shadow-[0_18px_44px_rgba(0,0,0,0.10)] dark:border-white/[0.10] dark:bg-[#25262a] dark:shadow-[0_22px_54px_rgba(0,0,0,0.36)]">
          <Tabs defaultValue="login" className="w-full gap-0">
            <TabsList className="mb-4 grid h-8 w-full grid-cols-2 rounded-[9px] border border-[color:var(--juno-hairline-soft)] bg-[#ececf0] p-0.5 dark:border-white/[0.08] dark:bg-[#1f2024]">
              <TabsTrigger
                value="login"
                className="h-full rounded-[7px] text-[13px] font-medium text-muted-foreground data-[state=active]:bg-[#fbfbfd] data-[state=active]:text-foreground data-[state=active]:shadow-[0_1px_3px_rgba(0,0,0,0.14)] dark:data-[state=active]:border-transparent dark:data-[state=active]:bg-[#33343a] dark:data-[state=active]:shadow-none"
              >
                登录
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="h-full rounded-[7px] text-[13px] font-medium text-muted-foreground data-[state=active]:bg-[#fbfbfd] data-[state=active]:text-foreground data-[state=active]:shadow-[0_1px_3px_rgba(0,0,0,0.14)] dark:data-[state=active]:border-transparent dark:data-[state=active]:bg-[#33343a] dark:data-[state=active]:shadow-none"
              >
                注册
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-0">
              <form onSubmit={handleLogin} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="login-account" className={authLabelClassName}>
                    账号
                  </Label>
                  <Input
                    id="login-account"
                    type="text"
                    placeholder="请输入账号"
                    value={loginAccount}
                    onChange={(e) => setLoginAccount(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="username"
                    autoCapitalize="none"
                    autoCorrect="off"
                    className={authFieldClassName}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-password" className={authLabelClassName}>
                    密码
                  </Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="请输入密码"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                    className={authFieldClassName}
                  />
                </div>
                <Button
                  type="submit"
                  className={`mt-1 w-full ${authPrimaryButtonClassName}`}
                  disabled={isLoading}
                >
                  {isLoading ? "登录中..." : "登录"}
                </Button>
              </form>

              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[#fbfbfd] px-2 text-muted-foreground dark:bg-[#25262a]">
                    或者
                  </span>
                </div>
              </div>

              <Button
                variant="ghost"
                className={authGhostButtonClassName}
                onClick={handleVisitorLogin}
                disabled={isLoading}
              >
                {isLoading ? "登录中..." : "游客登录"}
              </Button>
            </TabsContent>

            <TabsContent value="register" className="mt-0">
              <form onSubmit={handleRegister} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="register-account" className={authLabelClassName}>
                    账号
                  </Label>
                  <Input
                    id="register-account"
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
                    className={authFieldClassName}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="register-nickname" className={authLabelClassName}>
                    昵称（可选）
                  </Label>
                  <Input
                    id="register-nickname"
                    type="text"
                    placeholder="不填则自动生成"
                    value={registerNickname}
                    onChange={(e) => setRegisterNickname(e.target.value)}
                    disabled={isLoading}
                    maxLength={30}
                    autoComplete="nickname"
                    className={authFieldClassName}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="register-password" className={authLabelClassName}>
                    密码
                  </Label>
                  <Input
                    id="register-password"
                    type="password"
                    placeholder="至少6个字符"
                    value={registerPassword}
                    onChange={(e) => setRegisterPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    minLength={6}
                    autoComplete="new-password"
                    className={authFieldClassName}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="register-confirm-password"
                    className={authLabelClassName}
                  >
                    确认密码
                  </Label>
                  <Input
                    id="register-confirm-password"
                    type="password"
                    placeholder="再次输入密码"
                    value={registerConfirmPassword}
                    onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="new-password"
                    className={authFieldClassName}
                  />
                </div>
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
        </section>
      </main>
    </div>
  )
}

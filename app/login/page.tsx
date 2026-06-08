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
import { cn } from "@/lib/utils"

const authFieldClassName =
  "h-10 rounded-[13px] border-black/[0.10] bg-[#f3f4f7] px-3 text-[13px] shadow-[inset_0_1px_0_rgba(255,255,255,0.86)] placeholder:text-[#8b8f97] focus-visible:border-[#007aff]/60 focus-visible:bg-white focus-visible:ring-[3px] focus-visible:ring-[#007aff]/15 dark:border-white/[0.10] dark:bg-[#1b1c20] dark:shadow-none dark:placeholder:text-white/35 dark:focus-visible:bg-[#1d1e22]"

const authPrimaryButtonClassName =
  "h-9 rounded-[12px] border border-[#007aff]/25 bg-[#0a84ff] text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(0,122,255,0.20),inset_0_1px_0_rgba(255,255,255,0.24)] hover:bg-[#0077ed] active:translate-y-px active:shadow-[inset_0_1px_2px_rgba(0,0,0,0.18)] disabled:opacity-65 dark:border-[#4aa3ff]/20 dark:bg-[#0a84ff] dark:text-white dark:hover:bg-[#1991ff]"

const authGhostButtonClassName =
  "h-7 rounded-[10px] px-2 text-[12px] font-medium text-muted-foreground hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.055]"

const authLabelClassName = "text-[12px] font-medium text-foreground/78"

const authTabClassName =
  "juno-sidebar-switcher-button flex-1 h-8 rounded-[8px] text-[13px] font-medium text-center transition-colors duration-150 outline-none focus-visible:ring-0"

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
      <main className="w-full max-w-[412px]">
        <section className="overflow-hidden rounded-[26px] border border-black/[0.08] bg-[#fbfbfd] p-5 shadow-[0_24px_72px_rgba(35,42,54,0.16)] dark:border-white/[0.08] dark:bg-[#242529] dark:shadow-[0_28px_74px_rgba(0,0,0,0.48)] sm:p-7">
              <div className="mb-6 flex items-center gap-3">
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
                <TabsList className="juno-sidebar-switcher mb-5 grid h-9 w-full grid-cols-2 rounded-[12px] p-0.5">
                  <TabsTrigger
                    value="login"
                    className={cn(
                      authTabClassName,
                      authMode === "login"
                        ? "is-active text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    登录
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className={cn(
                      authTabClassName,
                      authMode === "register"
                        ? "is-active text-foreground"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
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

                  <div className="mt-4 flex items-center justify-center">
                    <Button
                      type="button"
                      variant="ghost"
                      className={authGhostButtonClassName}
                      onClick={handleVisitorLogin}
                      disabled={isLoading}
                    >
                      {isLoading ? "登录中..." : "游客登录"}
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
        </section>
      </main>
    </div>
  )
}

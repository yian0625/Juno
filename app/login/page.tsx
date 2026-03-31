"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { authAPI, setToken, setUser, getToken, getUser } from "@/lib/api"
import { toast } from "@/hooks/use-toast"

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
      // 生成或获取设备 ID
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
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text font-serif text-4xl font-bold italic tracking-wide text-transparent">
            Juno
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">AI 智能助手平台</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="glass-light grid w-full grid-cols-2 rounded-xl">
            <TabsTrigger value="login">登录</TabsTrigger>
            <TabsTrigger value="register">注册</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle>登录账户</CardTitle>
                <CardDescription>输入您的账号和密码以登录</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-account">账号</Label>
                    <Input
                      id="login-account"
                      type="text"
                      placeholder="请输入账号"
                      value={loginAccount}
                      onChange={(e) => setLoginAccount(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">密码</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="请输入密码"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <Button type="submit" className="w-full !text-white" disabled={isLoading}>
                    {isLoading ? "登录中..." : "登录"}
                  </Button>
                </form>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="px-2 text-muted-foreground">或者</span>
                  </div>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleVisitorLogin}
                  disabled={isLoading}
                >
                  {isLoading ? "登录中..." : "游客登录"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle>创建账户</CardTitle>
                <CardDescription>填写信息以创建新账户</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-account">账号</Label>
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
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-nickname">昵称（可选）</Label>
                    <Input
                      id="register-nickname"
                      type="text"
                      placeholder="不填则自动生成"
                      value={registerNickname}
                      onChange={(e) => setRegisterNickname(e.target.value)}
                      disabled={isLoading}
                      maxLength={30}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">密码</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="至少6个字符"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      required
                      disabled={isLoading}
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-confirm-password">确认密码</Label>
                    <Input
                      id="register-confirm-password"
                      type="password"
                      placeholder="再次输入密码"
                      value={registerConfirmPassword}
                      onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <Button type="submit" className="w-full !text-white" disabled={isLoading}>
                    {isLoading ? "注册中..." : "注册"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

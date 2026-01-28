import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card'

export default function AuthLayout({ title, description, children, footer }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md shadow-lg border-0">
        <CardHeader className="space-y-4 pb-2">
          {/* Logo placeholder */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center">
              {/* Logo will go here */}
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center text-gray-900">{title}</CardTitle>
            {description && (
              <CardDescription className="text-center text-gray-500">{description}</CardDescription>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {children}
        </CardContent>
        {footer && (
          <CardFooter className="justify-center pt-2 pb-6">
            {footer}
          </CardFooter>
        )}
      </Card>
    </div>
  )
}

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card'

export default function AuthLayout({ title, description, children, footer }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">{title}</CardTitle>
          {description && (
            <CardDescription className="text-center">{description}</CardDescription>
          )}
        </CardHeader>
        <CardContent>
          {children}
        </CardContent>
        {footer && (
          <CardFooter className="justify-center">
            {footer}
          </CardFooter>
        )}
      </Card>
    </div>
  )
}

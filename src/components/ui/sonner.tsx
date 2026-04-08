import { Toaster as SonnerToaster } from 'sonner'

type ToasterProps = React.ComponentProps<typeof SonnerToaster>

export function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast: 'bg-white border border-slate-200 shadow-lg text-slate-900 rounded-xl text-sm font-sans',
          description: 'text-slate-500',
          success: 'border-green-200',
          error: 'border-red-200',
        },
      }}
      {...props}
    />
  )
}

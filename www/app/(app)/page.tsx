import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

type DisplayCardProps = {
  title?: string
  description?: string
  action?: React.ReactNode
  content?: React.ReactNode
  footer?: React.ReactNode
}

function DisplayCard({
  title = "Card Title",
  description = "Card Description",
  action = "Card Action",
  content = "Card Content",
  footer = "Card Footer",
}: DisplayCardProps) {
  return (
    <Card>
      <CardHeader>
        {title ? <CardTitle>{title}</CardTitle> : null}
        {description ? <CardDescription>{description}</CardDescription> : null}
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent>
        {typeof content === "string" ? <p>{content}</p> : content}
      </CardContent>
      <CardFooter>
        {typeof footer === "string" ? <p>{footer}</p> : footer}
      </CardFooter>
    </Card>
  )
}

export default function Home() {
  const cards = [
    {
      title: "Card Title",
      description: "Card Description",
      action: "Card Action",
      content: "Card Content",
      footer: "Card Footer",
    }
  ]

  return (
    <div className="py-6 px-4">
      <div className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <DisplayCard
            key={card.title}
            title={card.title}
            description={card.description}
            action={card.action}
            content={card.content}
            footer={card.footer}
          />
        ))}
      </div>
    </div>
  )
}

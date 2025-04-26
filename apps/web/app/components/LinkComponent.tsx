import { Card } from "@repo/ui/card";

const LINKS = [
    {
        title: "Docs",
        href: "https://turborepo.com/docs",
        description: "Find in-depth information about Turborepo features and API.",
    },
    {
        title: "Learn",
        href: "https://turborepo.com/docs/handbook",
        description: "Learn more about monorepos with our handbook.",
    },
    {
        title: "Templates",
        href: "https://turborepo.com/docs/getting-started/from-example",
        description: "Choose from over 15 examples and deploy with a single click.",
    },
    {
        title: "Deploy",
        href: "https://vercel.com/new",
        description:
            "Instantly deploy your Turborepo to a shareable URL with Vercel.",
    },
];

export function LinkComponent() {
    return (
        <div>
            <div className="grid mb-32 text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-4 lg:text-left">
                {LINKS.map(({ title, href, description }) => (
                    <Card href={href} key={title} title={title}>
                        {description}
                    </Card>
                ))}
            </div>
        </div>
    )
}

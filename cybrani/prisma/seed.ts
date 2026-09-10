import { PrismaClient, Level, LessonType } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

type LessonSeed = {
  title: string;
  type: LessonType;
  durationMinutes: number;
  summary: string;
  content: string;
  quiz?: { prompt: string; options: string[]; correctOption: number }[];
};

type ModuleSeed = {
  title: string;
  lessons: LessonSeed[];
};

type CourseSeed = {
  slug: string;
  title: string;
  tagline: string;
  description: string;
  level: Level;
  priceCents: number;
  instructorName: string;
  instructorTitle: string;
  rating: number;
  ratingCount: number;
  studentCount: number;
  accentColor: string;
  skills: string[];
  category: { name: string; slug: string; icon: string };
  modules: ModuleSeed[];
};

function reading(title: string, minutes: number, summary: string, paragraphs: string[]): LessonSeed {
  return {
    title,
    type: "READING",
    durationMinutes: minutes,
    summary,
    content: paragraphs.join("\n\n"),
  };
}

function video(title: string, minutes: number, summary: string, paragraphs: string[]): LessonSeed {
  return {
    title,
    type: "VIDEO",
    durationMinutes: minutes,
    summary,
    content: paragraphs.join("\n\n"),
  };
}

function quiz(
  title: string,
  minutes: number,
  summary: string,
  questions: { prompt: string; options: string[]; correctOption: number }[]
): LessonSeed {
  return {
    title,
    type: "QUIZ",
    durationMinutes: minutes,
    summary,
    content: "Answer every question to check your understanding before moving on.",
    quiz: questions,
  };
}

const courses: CourseSeed[] = [
  {
    slug: "modern-web-development",
    title: "Modern Web Development with React & Next.js",
    tagline: "Ship production-grade web apps with the App Router, from zero to deployed.",
    description:
      "A project-based path through modern front-end engineering: component architecture, server rendering, data fetching, and deployment. You'll build a real multi-page application and leave with a portfolio project, not just notes.",
    level: "BEGINNER",
    priceCents: 4900,
    instructorName: "Maya Chen",
    instructorTitle: "Staff Engineer, ex-Vercel",
    rating: 4.9,
    ratingCount: 1284,
    studentCount: 18420,
    accentColor: "primary",
    skills: ["React", "Next.js", "TypeScript", "Tailwind CSS", "REST APIs"],
    category: { name: "Web Development", slug: "web-development", icon: "code" },
    modules: [
      {
        title: "Foundations",
        lessons: [
          video(
            "Why component-driven UI wins",
            8,
            "How componentization keeps large apps maintainable.",
            [
              "Component-driven development breaks an interface into small, independent, reusable pieces. Instead of thinking in pages, you think in buttons, cards, and forms that compose into pages.",
              "This lesson walks through the mental model: props flow down, events flow up, and state lives as close as possible to where it's used.",
            ]
          ),
          reading(
            "Setting up your toolchain",
            6,
            "Node, package managers, and the App Router project structure.",
            [
              "We install Node.js, choose a package manager, and scaffold a new Next.js project using the App Router — the routing model where folders under `app/` map to URL segments.",
              "You'll learn the role of `layout.tsx`, `page.tsx`, and route groups, and why colocating a route's UI, loading state, and error boundary keeps features self-contained.",
            ]
          ),
          quiz("Check your understanding: Foundations", 5, "Quick recall check on components and routing.", [
            {
              prompt: "In the App Router, which file defines the UI for a route segment?",
              options: ["route.ts", "page.tsx", "index.tsx", "app.tsx"],
              correctOption: 1,
            },
            {
              prompt: "What is the main benefit of component-driven UI?",
              options: [
                "Fewer files overall",
                "Reusable, independently testable pieces",
                "No need for state management",
                "Faster CSS parsing",
              ],
              correctOption: 1,
            },
          ]),
        ],
      },
      {
        title: "Data & Server Components",
        lessons: [
          video(
            "Server Components vs Client Components",
            10,
            "When to fetch on the server and when to reach for interactivity.",
            [
              "Server Components render on the server and ship zero JavaScript to the browser by default — ideal for data-heavy, mostly-static UI.",
              "Client Components opt into interactivity (state, effects, event handlers) with the `\"use client\"` directive. The rule of thumb: push `\"use client\"` as far down the tree as possible.",
            ]
          ),
          reading(
            "Fetching data the App Router way",
            9,
            "Async Server Components and colocated data fetching.",
            [
              "Async Server Components let you `await` your data source directly inside the component — no `useEffect`, no loading flicker on first paint.",
              "We cover caching semantics, revalidation, and how to stream slow data behind a `Suspense` boundary so the fast parts of the page render immediately.",
            ]
          ),
          video(
            "Forms and mutations with Server Actions",
            11,
            "Handling form submissions without hand-rolled API routes.",
            [
              "Server Actions let a form `action` call a server-side function directly, with progressive enhancement built in.",
              "We build a working enrollment form, validate input with Zod, and revalidate the affected route after a successful mutation.",
            ]
          ),
        ],
      },
      {
        title: "Styling & Component Systems",
        lessons: [
          video(
            "Utility-first CSS with Tailwind",
            9,
            "Building a consistent visual language without fighting specificity.",
            [
              "Tailwind's utility classes map directly to design tokens — spacing, color, and typography scales stay consistent across the whole app.",
              "We set up a themeable design system with CSS variables so light and dark mode share one source of truth.",
            ]
          ),
          reading(
            "Accessible components by default",
            7,
            "Keyboard navigation, focus rings, and semantic HTML.",
            [
              "Every interactive element needs a visible focus state, a large enough hit target, and correct semantics — a `<div onClick>` is never a substitute for a `<button>`.",
              "We audit a component library against WCAG 2.1 AA: contrast ratios, ARIA labeling, and reduced-motion support.",
            ]
          ),
        ],
      },
      {
        title: "Shipping to Production",
        lessons: [
          video(
            "Performance budgets that matter",
            10,
            "Core Web Vitals and how to keep bundles lean.",
            [
              "We measure Largest Contentful Paint, Interaction to Next Paint, and Cumulative Layout Shift, and connect each metric to a concrete code change.",
              "Lazy loading, image optimization, and code-splitting are covered with before/after bundle analysis.",
            ]
          ),
          reading(
            "Deploying and monitoring",
            8,
            "From `git push` to a live URL, with error tracking in place.",
            [
              "We deploy the finished project, wire up environment variables safely, and add basic uptime and error monitoring so regressions don't go unnoticed.",
            ]
          ),
          quiz("Final check: Shipping", 6, "Confirm you're ready to deploy your own project.", [
            {
              prompt: "Which metric measures visual stability during page load?",
              options: ["LCP", "CLS", "TTFB", "FCP"],
              correctOption: 1,
            },
            {
              prompt: "What directive turns a Server Component into a Client Component?",
              options: ["'use client'", "'use server'", "'use state'", "'client-only'"],
              correctOption: 0,
            },
          ]),
        ],
      },
    ],
  },
  {
    slug: "cybersecurity-fundamentals",
    title: "Cybersecurity Fundamentals: Think Like a Defender",
    tagline: "Learn how real attacks work so you can build systems that resist them.",
    description:
      "A hands-on introduction to application and network security. You'll study common attack techniques from the defender's seat, then apply mitigations to a sample application across authentication, input handling, and infrastructure.",
    level: "BEGINNER",
    priceCents: 5900,
    instructorName: "Daniel Osei",
    instructorTitle: "Security Engineer, former SOC lead",
    rating: 4.8,
    ratingCount: 963,
    studentCount: 11230,
    accentColor: "accent",
    skills: ["Threat Modeling", "OWASP Top 10", "Network Security", "Incident Response"],
    category: { name: "Cybersecurity", slug: "cybersecurity", icon: "shield" },
    modules: [
      {
        title: "Security Mindset",
        lessons: [
          video(
            "Thinking in threat models",
            9,
            "Assets, actors, and attack surfaces.",
            [
              "Before defending anything, you need to know what you're protecting, from whom, and what it's worth to an attacker. This lesson introduces the STRIDE framework for structured threat modeling.",
            ]
          ),
          reading(
            "The CIA triad in practice",
            6,
            "Confidentiality, integrity, and availability as design constraints.",
            [
              "Every security control trades off against usability and cost. We walk through real incidents where one leg of the CIA triad was sacrificed — and what it cost.",
            ]
          ),
        ],
      },
      {
        title: "Web Application Security",
        lessons: [
          video(
            "Injection attacks, from SQL to prompt injection",
            12,
            "Why untrusted input is the root of most breaches.",
            [
              "SQL injection, command injection, and the newer risk of prompt injection in LLM-backed apps all share a root cause: untrusted input treated as trusted instructions.",
              "We build a deliberately vulnerable query, exploit it, then fix it with parameterized queries and input validation.",
            ]
          ),
          video(
            "Authentication & session security",
            11,
            "Password storage, session fixation, and credential stuffing.",
            [
              "We compare hashing algorithms for password storage, walk through why plaintext and reversible encryption are both wrong, and implement rate limiting against credential stuffing.",
            ]
          ),
          reading(
            "Cross-site scripting and CSRF",
            8,
            "Client-side trust boundaries and how they break.",
            [
              "XSS lets an attacker run script in another user's browser session. CSRF tricks a browser into making an unwanted authenticated request. We cover output encoding, Content-Security-Policy, and same-site cookies as mitigations.",
            ]
          ),
          quiz("Check your understanding: Web AppSec", 6, "Test your grasp of common web vulnerabilities.", [
            {
              prompt: "What is the primary defense against SQL injection?",
              options: [
                "Blocklisting the word SELECT",
                "Parameterized queries",
                "Using a NoSQL database",
                "Minifying your JavaScript",
              ],
              correctOption: 1,
            },
            {
              prompt: "Which cookie attribute helps mitigate CSRF?",
              options: ["HttpOnly", "SameSite", "Secure", "Path"],
              correctOption: 1,
            },
          ]),
        ],
      },
      {
        title: "Network & Infrastructure",
        lessons: [
          video(
            "Segmenting networks and least privilege",
            10,
            "Limiting blast radius when — not if — something is compromised.",
            [
              "We design a segmented network with least-privilege access rules, so a compromised service can't freely reach the rest of the environment.",
            ]
          ),
          reading(
            "Incident response basics",
            9,
            "Detect, contain, eradicate, recover.",
            [
              "A practical walkthrough of the incident response lifecycle, with a tabletop exercise based on a simulated credential leak.",
            ]
          ),
        ],
      },
    ],
  },
  {
    slug: "data-science-with-python",
    title: "Data Science with Python: From Data to Decisions",
    tagline: "Analyze real datasets and communicate findings that drive decisions.",
    description:
      "Learn the full data science workflow: cleaning messy data, exploratory analysis, statistical reasoning, and building your first predictive models — all in Python with pandas and scikit-learn.",
    level: "INTERMEDIATE",
    priceCents: 5400,
    instructorName: "Priya Nair",
    instructorTitle: "Senior Data Scientist",
    rating: 4.7,
    ratingCount: 742,
    studentCount: 9310,
    accentColor: "primary",
    skills: ["Python", "pandas", "Statistics", "scikit-learn", "Data Visualization"],
    category: { name: "Data Science", slug: "data-science", icon: "chart" },
    modules: [
      {
        title: "Working with Data",
        lessons: [
          video(
            "Loading and cleaning real-world data",
            10,
            "Missing values, duplicates, and type coercion with pandas.",
            [
              "Real datasets are messy. We load a raw CSV, profile it for missing values and outliers, and build a repeatable cleaning pipeline.",
            ]
          ),
          reading(
            "Exploratory data analysis",
            8,
            "Asking good questions before modeling anything.",
            [
              "EDA is about building intuition: distributions, correlations, and grouped summaries reveal what's worth modeling and what's noise.",
            ]
          ),
        ],
      },
      {
        title: "Statistics for Decisions",
        lessons: [
          video(
            "Hypothesis testing without the jargon",
            11,
            "p-values, confidence intervals, and what they actually mean.",
            [
              "We run an A/B test analysis end to end, and spend real time on what a p-value does *not* tell you — a common source of bad decisions.",
            ]
          ),
          quiz("Check your understanding: Statistics", 5, "Confirm your grasp of core statistical ideas.", [
            {
              prompt: "A p-value of 0.03 means:",
              options: [
                "There's a 3% chance the null hypothesis is true",
                "There's a 97% chance the effect is real",
                "Assuming the null hypothesis, this result (or more extreme) had a 3% chance of occurring",
                "The effect size is 3%",
              ],
              correctOption: 2,
            },
          ]),
        ],
      },
      {
        title: "Your First Models",
        lessons: [
          video(
            "Regression and classification with scikit-learn",
            13,
            "Training, evaluating, and avoiding overfitting.",
            [
              "We train a regression model to predict a continuous value and a classifier to predict a category, evaluating both with the right metrics — not just accuracy.",
            ]
          ),
          reading(
            "Communicating results to non-technical stakeholders",
            7,
            "Charts and narratives that drive decisions, not confusion.",
            [
              "A model is only useful if someone acts on it. We cover how to visualize uncertainty and frame findings around the decision they inform.",
            ]
          ),
        ],
      },
    ],
  },
  {
    slug: "ui-ux-design-foundations",
    title: "UI/UX Design Foundations",
    tagline: "Design interfaces people actually enjoy using — grounded in research, not guesswork.",
    description:
      "Move from wireframes to polished, accessible interfaces. This course covers user research, information architecture, visual design systems, and usability testing, with a full case study you can put in your portfolio.",
    level: "BEGINNER",
    priceCents: 4400,
    instructorName: "Sofia Almeida",
    instructorTitle: "Design Lead",
    rating: 4.9,
    ratingCount: 1105,
    studentCount: 14870,
    accentColor: "accent",
    skills: ["User Research", "Wireframing", "Design Systems", "Accessibility", "Figma"],
    category: { name: "Design", slug: "design", icon: "palette" },
    modules: [
      {
        title: "Research & Strategy",
        lessons: [
          video(
            "Talking to users without leading them",
            9,
            "Writing interview scripts that surface real problems.",
            [
              "Most user interviews accidentally lead the witness. We rewrite a biased script into one that surfaces honest, useful signal.",
            ]
          ),
          reading(
            "Information architecture basics",
            7,
            "Organizing content so people can find what they need.",
            [
              "Card sorting, sitemaps, and navigation hierarchies — how to structure a product so users build an accurate mental model fast.",
            ]
          ),
        ],
      },
      {
        title: "Visual Design Systems",
        lessons: [
          video(
            "Building a design system from tokens up",
            11,
            "Color, type, and spacing scales that scale with the product.",
            [
              "We construct a token-based design system — primitive, semantic, then component tokens — so a single color change propagates consistently everywhere.",
            ]
          ),
          video(
            "Accessible color and typography",
            8,
            "Contrast ratios, type scale, and readable line lengths.",
            [
              "We audit a palette for WCAG contrast compliance in both light and dark mode, and set a type scale with sane line-height and measure.",
            ]
          ),
        ],
      },
      {
        title: "Prototyping & Testing",
        lessons: [
          reading(
            "From wireframe to high-fidelity prototype",
            8,
            "Fidelity levels and when each one is worth the effort.",
            [
              "Low-fidelity wireframes are for testing structure fast; high-fidelity prototypes are for testing visual and interaction details. We cover when to use each.",
            ]
          ),
          quiz("Check your understanding: Design Systems", 5, "Test your recall on tokens and accessibility.", [
            {
              prompt: "What is the minimum contrast ratio for normal body text under WCAG AA?",
              options: ["3:1", "4.5:1", "7:1", "2:1"],
              correctOption: 1,
            },
          ]),
        ],
      },
    ],
  },
  {
    slug: "ai-and-machine-learning-primer",
    title: "AI & Machine Learning Primer",
    tagline: "Understand how modern AI systems actually work, from first principles to LLMs.",
    description:
      "A conceptual, math-light introduction to machine learning and the transformer architecture behind today's large language models. Includes hands-on notebooks so you build intuition, not just vocabulary.",
    level: "INTERMEDIATE",
    priceCents: 6400,
    instructorName: "Kenji Watanabe",
    instructorTitle: "ML Research Engineer",
    rating: 4.8,
    ratingCount: 588,
    studentCount: 7640,
    accentColor: "primary",
    skills: ["Machine Learning", "Neural Networks", "Transformers", "Prompt Engineering"],
    category: { name: "Artificial Intelligence", slug: "artificial-intelligence", icon: "cpu" },
    modules: [
      {
        title: "How Machines Learn",
        lessons: [
          video(
            "From rules to learned patterns",
            9,
            "Why we moved from hand-coded logic to trained models.",
            [
              "We trace the shift from explicit rule systems to models that learn patterns from data, and why that trade-off matters for reliability and interpretability.",
            ]
          ),
          reading(
            "Training, validation, and the overfitting trap",
            7,
            "Why a model that memorizes isn't a model that generalizes.",
            [
              "We split a dataset into training and validation sets, and show exactly what overfitting looks like on a learning curve.",
            ]
          ),
        ],
      },
      {
        title: "Inside Neural Networks",
        lessons: [
          video(
            "Neurons, layers, and backpropagation",
            12,
            "The core mechanics of how a network learns from error.",
            [
              "We build intuition for forward passes, loss functions, and gradient descent without diving into full calculus derivations.",
            ]
          ),
        ],
      },
      {
        title: "The Transformer Era",
        lessons: [
          video(
            "Attention is all you need — explained simply",
            13,
            "How transformers process sequences differently than older architectures.",
            [
              "We unpack self-attention with a concrete example sentence, showing how a model decides which words to 'attend to' when predicting the next token.",
            ]
          ),
          reading(
            "Prompting large language models effectively",
            8,
            "Practical techniques for getting reliable output.",
            [
              "Few-shot examples, explicit constraints, and structured output formats — practical patterns for getting consistent results from an LLM.",
            ]
          ),
          quiz("Check your understanding: Transformers", 6, "Test your grasp of the core concepts.", [
            {
              prompt: "What mechanism lets transformers weigh the relevance of other tokens in a sequence?",
              options: ["Convolution", "Self-attention", "Pooling", "Backpropagation"],
              correctOption: 1,
            },
          ]),
        ],
      },
    ],
  },
  {
    slug: "cloud-infrastructure-with-aws",
    title: "Cloud Infrastructure with AWS",
    tagline: "Design, deploy, and scale infrastructure that doesn't fall over.",
    description:
      "A practical path through core AWS services — compute, storage, networking, and IAM — plus infrastructure-as-code with Terraform. You'll deploy a real multi-tier application and set up monitoring for it.",
    level: "ADVANCED",
    priceCents: 6900,
    instructorName: "Elena Petrova",
    instructorTitle: "Cloud Architect",
    rating: 4.7,
    ratingCount: 401,
    studentCount: 5210,
    accentColor: "accent",
    skills: ["AWS", "Terraform", "Networking", "IAM", "Observability"],
    category: { name: "Cloud Computing", slug: "cloud-computing", icon: "cloud" },
    modules: [
      {
        title: "Core Building Blocks",
        lessons: [
          video(
            "Compute options and when to use each",
            10,
            "EC2, containers, and serverless — trade-offs that matter.",
            [
              "We compare virtual machines, container orchestration, and serverless functions across cost, scaling behavior, and operational overhead.",
            ]
          ),
          reading(
            "Identity and access management done right",
            9,
            "Least privilege as a default, not an afterthought.",
            [
              "We design an IAM policy from scratch using least-privilege principles, and cover the most common misconfiguration that leads to breaches: overly broad wildcard permissions.",
            ]
          ),
        ],
      },
      {
        title: "Infrastructure as Code",
        lessons: [
          video(
            "Provisioning with Terraform",
            12,
            "Declarative infrastructure you can review, version, and roll back.",
            [
              "We provision a VPC, subnets, and a load-balanced compute tier entirely in Terraform, and discuss why declarative infra beats manual console clicks for anything beyond a demo.",
            ]
          ),
        ],
      },
      {
        title: "Reliability & Observability",
        lessons: [
          reading(
            "Designing for failure",
            8,
            "Redundancy, health checks, and graceful degradation.",
            [
              "Every component fails eventually. We design a system that degrades gracefully instead of falling over completely when one piece goes down.",
            ]
          ),
          quiz("Check your understanding: Cloud Infrastructure", 6, "Confirm your grasp of core AWS concepts.", [
            {
              prompt: "What IAM principle minimizes blast radius from a compromised credential?",
              options: ["Least privilege", "Shared root access", "Static long-lived keys everywhere", "Public S3 buckets"],
              correctOption: 0,
            },
          ]),
        ],
      },
    ],
  },
];

async function main() {
  console.log("Seeding Cybrani...");

  await db.quizAttempt.deleteMany();
  await db.lessonProgress.deleteMany();
  await db.enrollment.deleteMany();
  await db.quizQuestion.deleteMany();
  await db.lesson.deleteMany();
  await db.module.deleteMany();
  await db.courseSkill.deleteMany();
  await db.course.deleteMany();
  await db.category.deleteMany();
  await db.user.deleteMany();

  const demoPasswordHash = await bcrypt.hash("password123", 10);
  const demoUser = await db.user.create({
    data: {
      name: "Alex Rivera",
      email: "demo@cybrani.com",
      passwordHash: demoPasswordHash,
      bio: "Aspiring full-stack developer, learning one course at a time.",
    },
  });

  const createdCourses = [] as { id: string; slug: string; modules: { id: string; lessons: { id: string }[] }[] }[];

  for (const c of courses) {
    const category = await db.category.upsert({
      where: { slug: c.category.slug },
      update: {},
      create: c.category,
    });

    const course = await db.course.create({
      data: {
        slug: c.slug,
        title: c.title,
        tagline: c.tagline,
        description: c.description,
        level: c.level,
        priceCents: c.priceCents,
        durationMinutes: c.modules
          .flatMap((m) => m.lessons)
          .reduce((sum, l) => sum + l.durationMinutes, 0),
        instructorName: c.instructorName,
        instructorTitle: c.instructorTitle,
        rating: c.rating,
        ratingCount: c.ratingCount,
        studentCount: c.studentCount,
        accentColor: c.accentColor,
        categoryId: category.id,
        skills: { create: c.skills.map((label) => ({ label })) },
      },
    });

    const moduleRecords = [];
    for (const [mi, m] of c.modules.entries()) {
      const moduleRecord = await db.module.create({
        data: { title: m.title, order: mi, courseId: course.id },
      });

      const lessonRecords = [];
      for (const [li, l] of m.lessons.entries()) {
        const lesson = await db.lesson.create({
          data: {
            title: l.title,
            order: li,
            type: l.type,
            durationMinutes: l.durationMinutes,
            summary: l.summary,
            content: l.content,
            moduleId: moduleRecord.id,
          },
        });

        if (l.quiz) {
          for (const q of l.quiz) {
            await db.quizQuestion.create({
              data: {
                lessonId: lesson.id,
                prompt: q.prompt,
                options: JSON.stringify(q.options),
                correctOption: q.correctOption,
              },
            });
          }
        }

        lessonRecords.push({ id: lesson.id });
      }
      moduleRecords.push({ id: moduleRecord.id, lessons: lessonRecords });
    }

    createdCourses.push({ id: course.id, slug: course.slug, modules: moduleRecords });
  }

  const webDev = createdCourses.find((c) => c.slug === "modern-web-development")!;
  const security = createdCourses.find((c) => c.slug === "cybersecurity-fundamentals")!;
  const design = createdCourses.find((c) => c.slug === "ui-ux-design-foundations")!;

  await db.enrollment.create({ data: { userId: demoUser.id, courseId: webDev.id } });
  await db.enrollment.create({ data: { userId: demoUser.id, courseId: security.id } });
  await db.enrollment.create({ data: { userId: demoUser.id, courseId: design.id } });

  const webDevLessons = webDev.modules.flatMap((m) => m.lessons);
  for (const lesson of webDevLessons.slice(0, 5)) {
    await db.lessonProgress.create({
      data: { userId: demoUser.id, lessonId: lesson.id, completedAt: new Date() },
    });
  }

  const securityLessons = security.modules.flatMap((m) => m.lessons);
  for (const lesson of securityLessons.slice(0, 2)) {
    await db.lessonProgress.create({
      data: { userId: demoUser.id, lessonId: lesson.id, completedAt: new Date() },
    });
  }

  console.log(`Seeded ${courses.length} courses.`);
  console.log("Demo login -> email: demo@cybrani.com / password: password123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });

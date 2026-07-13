import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <>
          <img
            src="/logo.svg"
            alt=""
            width={20}
            height={20}
            className="dark:invert"
          />
          Hypercube
        </>
      ),
    },
    githubUrl: 'https://github.com/agx-computer/hypercube',
  };
}

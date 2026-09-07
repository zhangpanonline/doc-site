import React from 'react';
import clsx from 'clsx';
import {ThemeClassNames} from '@docusaurus/theme-common';
import {useDoc, useSidebarBreadcrumbs} from '@docusaurus/plugin-content-docs/client';
import Link from '@docusaurus/Link';
import {translate} from '@docusaurus/Translate';

import styles from './styles.module.css';

function CrumbLink({
  label,
  href,
  isLast,
}: {
  label: string;
  href: string | undefined;
  isLast: boolean;
}): React.JSX.Element {
  if (isLast) {
    return <span className="breadcrumbs__link">{label}</span>;
  }
  return href ? (
    <Link className="breadcrumbs__link" href={href}>
      <span>{label}</span>
    </Link>
  ) : (
    <span className="breadcrumbs__link">{label}</span>
  );
}

function HomeBreadcrumbItem(): React.JSX.Element {
  return (
    <li className="breadcrumbs__item">
      <Link
        aria-label={translate({
          id: 'theme.docs.breadcrumbs.home',
          message: 'Home page',
          description: 'The ARIA label for the home page in the breadcrumbs',
        })}
        className="breadcrumbs__link"
        href="/">
        <span aria-hidden="true">🏠</span>
      </Link>
    </li>
  );
}

const SECTION_LINKS: Record<string, {label: string; href: string}> = {
  agents: {label: 'Agents 应用开发能力', href: '/agents/'},
  backend: {label: '后端开发能力', href: '/backend/'},
  devops: {label: '运维和云计算能力', href: '/devops/'},
  'ai-coding': {label: '高效 AI 编程能力', href: '/ai-coding/'},
  fullstack: {label: '企业级全栈项目', href: '/fullstack/'},
  career: {label: '就业指导', href: '/career/'},
  common: {label: '公共', href: '/common/'},
  jobs: {label: '岗位地图', href: '/jobs/'},
};

export default function DocBreadcrumbs(): React.JSX.Element | null {
  const breadcrumbs = useSidebarBreadcrumbs();

  if (!breadcrumbs) {
    return null;
  }

  const doc = useDoc();
  const docSegments = doc.metadata.id.split('/');
  const section = SECTION_LINKS[docSegments[0]];
  // 「板块/课程/节」三级以上，或板块内的二级子页（非板块首页自身）才插入板块层
  const isSectionIndex =
    docSegments.length === 2 && docSegments[1] === 'index';
  const showSectionCrumb =
    section !== undefined &&
    (docSegments.length >= 3 || (docSegments.length === 2 && !isSectionIndex));

  return (
    <nav
      className={clsx(
        ThemeClassNames.docs.docBreadcrumbs,
        styles.breadcrumbsContainer,
      )}
      aria-label={translate({
        id: 'theme.docs.breadcrumbs.navAriaLabel',
        message: 'Breadcrumbs',
        description: 'The ARIA label for the breadcrumbs',
      })}>
      <ul className="breadcrumbs">
        <HomeBreadcrumbItem />
        {showSectionCrumb && (
          <li className="breadcrumbs__item">
            <CrumbLink label={section.label} href={section.href} isLast={false} />
          </li>
        )}
        {breadcrumbs.map((item, idx) => {
          const isLast = idx === breadcrumbs.length - 1;
          const href =
            item.type === 'category' && item.linkUnlisted
              ? undefined
              : item.href;
          return (
            <li
              key={idx}
              className={clsx('breadcrumbs__item', {
                'breadcrumbs__item--active': isLast,
              })}>
              <CrumbLink label={item.label} href={href} isLast={isLast} />
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

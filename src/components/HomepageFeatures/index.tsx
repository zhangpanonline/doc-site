import type {ReactNode} from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';

type FeatureItem = {
  title: string;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: '前端工程化',
    description: (
      <>
        TypeScript、微前端、Turborepo、GitHub Actions 等现代前端工程化实践笔记。
      </>
    ),
  },
  {
    title: '后端学习',
    description: (
      <>
        NestJS 从入门到鉴权授权，PostgreSQL 从安装到高级特性，系统化后端知识沉淀。
      </>
    ),
  },
  {
    title: '面试题库',
    description: (
      <>
        Vue2/Vue3/React 分类面试题，项目案例复盘，持续更新中。
      </>
    ),
  },
];

function Feature({title, description}: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}

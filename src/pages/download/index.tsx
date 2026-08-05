import Layout from '@theme/Layout';
import style from './index.module.css';
import fileList from './fileList.json';

type FileItem = {
  name: string;
  path: string;
  size: string;
};

const typedList = fileList as FileItem[];

export default function Download() {
  return (
    <Layout title="资源下载" description="文档、简历等资源下载">
      <div className={style.page}>
        {typedList.length === 0 ? (
          <p className={style.empty}>暂无文件</p>
        ) : (
          <>
            <div className={style.header}>
              <span>文件名</span>
              <span>大小</span>
            </div>
            {typedList.map((o) => (
              <a key={o.name} className={style.item} href={o.path} download={o.name}>
                <span>{o.name}</span>
                <span>{o.size}</span>
              </a>
            ))}
          </>
        )}
      </div>
    </Layout>
  );
}

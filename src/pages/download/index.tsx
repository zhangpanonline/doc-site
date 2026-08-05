// import React from 'react';
import Layout from '@theme/Layout';
import style from './index.module.css'
import fileList from './fileList.json'
export default function Download() {
  return (
    <Layout title="资源服务器" description="AAA">
        <ul className={ style.page } >
            <p className={style.item} >
                <span>文件名</span>
                <span>大小</span>
                {/* <span>上传日期</span> */}
            </p>
            {fileList.map((o, idx) => <li key={idx}>
                <a className={ style.item } href={o.path} download={o.name}>
                    <span>{o.name}</span>  <span>{o.size}</span>  
                    {/* <span>{o.date}</span> */}
                </a>
            </li>)}
        </ul>
    </Layout>
  );
}
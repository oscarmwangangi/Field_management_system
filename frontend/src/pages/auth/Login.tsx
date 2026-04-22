
export default function Login(){

    return(
        <>
        <div className="flex gap-20 flex-col justify-center items-center h-screen">

            <form>

            
            <div>
                <label>email</label>
                <input type="email" />
            </div>
            
            <div>
                <label>Password</label>
                <div>
                    <input type="password" />
                </div>
            </div>
            <div>
                <button type="submit"
                className="hover:cursor"
                >submit</button>
            </div>
            </form>


        </div>
        </>
    )
}